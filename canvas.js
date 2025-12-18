// Canvas View Controller using GoJS
let diagram = null;
let currentView = 'grid';
let autoSaveTimeout = null;
let lastCanvasCollectionId = null; // Track which collection the canvas was last loaded for

// Canvas status helper
function setCanvasStatus(text, state) {
  const el = document.getElementById('canvas-status');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('saving', 'saved', 'error');
  if (state) el.classList.add(state);
}

// Color mapping for bookmark types
const BOOKMARK_COLORS = {
  'link': '#3b82f6',
  'text': '#8b5cf6',
  'image': '#ec4899',
  'video': '#f97316',
  'audio': '#22c55e'
};

// Initialize the diagram when DOM is ready
function initCanvas() {
  const $ = go.GraphObject.make;

  diagram = $(go.Diagram, 'canvas-diagram', {
    'undoManager.isEnabled': true,
    'grid.visible': true,
    'grid.gridCellSize': new go.Size(20, 20),
    'allowDrop': true,
    'allowCopy': false,
    'toolManager.mouseWheelBehavior': go.ToolManager.WheelZoom,
    // Provide a default GridLayout so Auto Layout does something
    layout: $(go.GridLayout, {
      wrappingColumn: 4,
      spacing: new go.Size(220, 120),
      alignment: go.GridLayout.Location
    }),
    'linkingTool.isEnabled': true,
    'linkingTool.direction': go.LinkingTool.ForwardsOnly,
    'relinkingTool.isEnabled': true,
    'animationManager.isEnabled': false,
    'ModelChanged': function(e) {
      if (e.isTransactionFinished) {
        // Debounced auto-save
        if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
        setCanvasStatus('Saving…', 'saving');
        autoSaveTimeout = setTimeout(() => saveCanvasData(), 1000);
      }
    }
  });

  // Define the node template for bookmarks
  diagram.nodeTemplate =
    $(go.Node, 'Auto',
      {
        locationSpot: go.Spot.Center,
        movable: true,
        selectable: true,
        cursor: 'pointer',
        dragComputation: function(node, pt, gridpt) {
          return gridpt; // Snap to grid
        }
      },
      new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
      
      // Node background and border
      $(go.Shape, 'RoundedRectangle',
        {
          fill: '#ffffff',
          stroke: '#e5e7eb',
          strokeWidth: 1,
          portId: '',
          fromLinkable: true,
          toLinkable: true,
          minSize: new go.Size(180, 80),
          maxSize: new go.Size(220, 120)
        },
        new go.Binding('fill', 'isHighlighted', function(h) { return h ? '#fff3cd' : '#ffffff'; }).ofObject(),
        new go.Binding('stroke', 'color')
      ),
      
      // Node content
      $(go.Panel, 'Vertical',
        {
          margin: 12,
          maxSize: new go.Size(200, NaN)
        },
        
        // Header with color indicator and title
        $(go.Panel, 'Horizontal',
          {
            alignment: go.Spot.Left
          },
          $(go.Shape, 'Circle',
            {
              width: 12,
              height: 12,
              margin: new go.Margin(0, 8, 0, 0)
            },
            new go.Binding('fill', 'color')
          ),
          $(go.TextBlock,
            {
              font: 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              stroke: '#1f2937',
              maxLines: 2,
              overflow: go.TextBlock.OverflowEllipsis,
              maxSize: new go.Size(140, NaN),
              wrap: go.TextBlock.WrapFit
            },
            new go.Binding('text', 'title')
          )
        ),
        
        // Domain or type
        $(go.TextBlock,
          {
            font: '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            stroke: '#6b7280',
            margin: new go.Margin(4, 0, 0, 0),
            maxSize: new go.Size(180, NaN),
            wrap: go.TextBlock.WrapFit
          },
          new go.Binding('text', 'domain')
        )
      ),
      
      // Context menu
      {
        contextMenu:
          $(go.Adornment, 'Vertical',
            $('ContextMenuButton',
              $(go.TextBlock, 'View Bookmark'),
              { click: function(e, obj) { viewBookmark(obj.part.adornedPart.data); } }
            ),
            $('ContextMenuButton',
              $(go.TextBlock, 'Remove from Canvas'),
              { click: function(e, obj) { removeNodeFromCanvas(obj.part.adornedPart.data); } }
            )
          )
      }
    );

  // Define the link template for connections between bookmarks
  diagram.linkTemplate =
    $(go.Link,
      {
        routing: go.Link.AvoidsNodes,
        curve: go.Link.JumpOver,
        corner: 8,
        toShortLength: 4,
        relinkableFrom: true,
        relinkableTo: true,
        selectable: true,
        shadowVisible: false
      },
      new go.Binding('points').makeTwoWay(),
      
      // Link path
      $(go.Shape,
        {
          isPanelMain: true,
          strokeWidth: 2,
          stroke: '#8b5cf6'
        }
      ),
      
      // Arrowhead
      $(go.Shape,
        {
          toArrow: 'Standard',
          stroke: null,
          fill: '#8b5cf6',
          scale: 1.2
        }
      ),
      
      // Optional label on link
      $(go.Panel, 'Auto',
        $(go.Shape, 'RoundedRectangle',
          {
            fill: '#ffffff',
            stroke: '#e5e7eb'
          }
        ),
        $(go.TextBlock,
          {
            font: '11px sans-serif',
            margin: 4,
            editable: true
          },
          new go.Binding('text', 'label').makeTwoWay()
        )
      ),
      
      // Context menu for links
      {
        contextMenu:
          $(go.Adornment, 'Vertical',
            $('ContextMenuButton',
              $(go.TextBlock, 'Add Label'),
              {
                click: function(e, obj) {
                  const link = obj.part.adornedPart;
                  diagram.startTransaction('add label');
                  diagram.model.setDataProperty(link.data, 'label', 'Label');
                  diagram.commitTransaction('add label');
                }
              }
            ),
            $('ContextMenuButton',
              $(go.TextBlock, 'Delete Connection'),
              {
                click: function(e, obj) {
                  diagram.startTransaction('delete link');
                  diagram.remove(obj.part.adornedPart);
                  diagram.commitTransaction('delete link');
                }
              }
            )
          )
      }
    );

  // Enable the LinkingTool (use default left-drag from a node port)
  const linkingTool = diagram.toolManager.linkingTool;
  linkingTool.archetypeLinkData = {};
  linkingTool.isUnconnectedLinkValid = false;

  // Add context menu for auto-layout
  diagram.contextMenu = $(go.Adornment, 'Vertical',
    $('ContextMenuButton',
      $(go.TextBlock, 'Auto Layout'),
      { click: function() { performAutoLayout(); } }
    )
  );

  // Wire up toolbar buttons
  wireCanvasControls();

  setCanvasStatus('Ready');
  console.log('Canvas initialized');
}

// Wire up canvas toolbar controls
function wireCanvasControls() {
  const zoomInBtn = document.getElementById('canvas-zoom-in');
  const zoomOutBtn = document.getElementById('canvas-zoom-out');
  const resetZoomBtn = document.getElementById('canvas-reset-zoom');
  const autoLayoutBtn = document.getElementById('canvas-auto-layout');
  const saveBtn = document.getElementById('canvas-save');

  console.log('Canvas controls found:', {
    zoomIn: !!zoomInBtn,
    zoomOut: !!zoomOutBtn,
    reset: !!resetZoomBtn,
    autoLayout: !!autoLayoutBtn,
    save: !!saveBtn
  });

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      if (diagram) {
        diagram.commandHandler.increaseZoom();
        console.log('Zoom in:', diagram.scale);
      }
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      if (diagram) {
        diagram.commandHandler.decreaseZoom();
        console.log('Zoom out:', diagram.scale);
      }
    });
  }

  if (resetZoomBtn) {
    resetZoomBtn.addEventListener('click', () => {
      if (diagram) {
        // Use CommandHandler if available, else set directly
        if (diagram.commandHandler && diagram.commandHandler.resetZoom) {
          diagram.commandHandler.resetZoom();
        } else {
          diagram.scale = 1;
          diagram.position = new go.Point(0, 0);
        }
        console.log('Reset zoom:', diagram.scale, diagram.position.toString());
      }
    });
  }

  if (autoLayoutBtn) {
    autoLayoutBtn.addEventListener('click', () => {
      performAutoLayout();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveCanvasData(true); // Force immediate save with notification
    });
  }
}

// Perform auto-layout
function performAutoLayout() {
  if (!diagram) return;
  // Ensure we have a GridLayout configured
  const $ = go.GraphObject.make;
  if (!(diagram.layout instanceof go.GridLayout)) {
    diagram.layout = $(go.GridLayout, {
      wrappingColumn: 4,
      spacing: new go.Size(220, 120),
      alignment: go.GridLayout.Location
    });
  }

  diagram.startTransaction('auto layout');
  diagram.layoutDiagram(true);
  diagram.commitTransaction('auto layout');
  
  showToast('Layout applied');
}

// Load canvas data from API
async function loadCanvasData() {
  if (!currentUser) {
    console.log('No user logged in');
    return;
  }

  // If no bookmarks, show empty canvas
  if (!state.bookmarks || state.bookmarks.length === 0) {
    console.log('No bookmarks to display on canvas');
    if (diagram) {
      diagram.model = new go.GraphLinksModel([], []);
    }
    setCanvasStatus('Ready');
    return;
  }

  setCanvasStatus('Loading…');

  try {
    let positions = [];
    let connections = [];

    // Only fetch saved positions/connections if we have a specific collection
    if (state.collectionId) {
      const response = await fetch(
        `${API_BASE}/canvas.php?collection_id=${state.collectionId}`,
        {
          credentials: 'include',
          headers: {
            'X-User-ID': currentUser.user_id,
            'X-User-Email': currentUser.email
          }
        }
      );

      if (response.ok) {
        const raw = await response.text();
        try {
          const data = JSON.parse(raw);
          if (data.success) {
            positions = data.data.positions || [];
            connections = data.data.connections || [];
          } else {
            console.error('Canvas GET error JSON:', data);
          }
        } catch (e) {
          console.error('Canvas GET non-JSON response:', raw);
        }
      } else {
        const raw = await response.text();
        console.error('Canvas GET failed:', response.status, raw);
      }
    }
    
    // Create node data from bookmarks with positions
    const nodeDataArray = state.bookmarks.map((bookmark, index) => {
      const position = positions.find(p => p.bookmark_id == bookmark.id);
      const color = BOOKMARK_COLORS[bookmark.type] || '#6b7280';
      const domain = extractDomain(bookmark.url);
      
      return {
        key: bookmark.id,
        title: bookmark.title,
        type: bookmark.type,
        color: color,
        domain: domain,
        favorite: bookmark.favorite,
        loc: position ? `${position.x_position} ${position.y_position}` : getAutoLayoutPosition(index),
        bookmark: bookmark
      };
    });

    // Create link data from connections
    const linkDataArray = connections.map(conn => ({
      from: conn.from_bookmark_id,
      to: conn.to_bookmark_id,
      label: conn.label || ''
    }));

    if (diagram) {
      diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
      console.log('Canvas data loaded:', nodeDataArray.length, 'nodes,', linkDataArray.length, 'links');
    }

    // Track which collection this canvas is showing
    lastCanvasCollectionId = state.collectionId;

    if (state.collectionId) {
      setCanvasStatus('Ready');
    } else {
      setCanvasStatus('Viewing All — not saving');
    }
  } catch (error) {
    console.error('Error loading canvas data:', error);
    setCanvasStatus('Error loading', 'error');
    // Still show bookmarks even if loading positions failed
    const nodeDataArray = state.bookmarks.map((bookmark, index) => ({
      key: bookmark.id,
      title: bookmark.title,
      type: bookmark.type,
      color: BOOKMARK_COLORS[bookmark.type] || '#6b7280',
      domain: extractDomain(bookmark.url),
      favorite: bookmark.favorite,
      loc: getAutoLayoutPosition(index),
      bookmark: bookmark
    }));
    if (diagram) {
      diagram.model = new go.GraphLinksModel(nodeDataArray, []);
    }
  }
}

// Save canvas data to API
async function saveCanvasData(showNotification = false) {
  if (!currentUser || !diagram) {
    return;
  }

  // Don't save if no specific collection is selected
  if (!state.collectionId) {
    console.log('Canvas positions not saved - no specific collection selected');
    setCanvasStatus('Viewing All — not saving');
    return;
  }

  const positions = [];
  const connections = [];

  // Collect node positions
  diagram.nodes.each(node => {
    const loc = node.location;
    positions.push({
      bookmark_id: node.data.key,
      x_position: loc.x,
      y_position: loc.y
    });
  });

  // Collect link connections
  diagram.links.each(link => {
    connections.push({
      from_bookmark_id: link.data.from,
      to_bookmark_id: link.data.to,
      label: link.data.label || ''
    });
  });

  setCanvasStatus('Saving…', 'saving');
  try {
    const response = await fetch(`${API_BASE}/canvas.php`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': currentUser.user_id,
        'X-User-Email': currentUser.email
      },
      body: JSON.stringify({
        collection_id: state.collectionId,
        positions: positions,
        connections: connections
      })
    });

    const raw = await response.text();
    try {
      const data = JSON.parse(raw);
      if (!data.success) {
        console.error('Failed to save canvas data:', data.error);
        setCanvasStatus('Error saving', 'error');
        if (showNotification) showToast('Failed to save canvas', 'error');
      } else {
        console.log('Canvas data saved successfully');
        setCanvasStatus('Saved', 'saved');
        if (showNotification) showToast('Canvas saved successfully', 'success');
      }
    } catch (e) {
      console.error('Canvas POST non-JSON response:', raw);
      setCanvasStatus('Error saving', 'error');
      if (showNotification) showToast('Error saving canvas', 'error');
    }
  } catch (error) {
    console.error('Error saving canvas data:', error);
    setCanvasStatus('Error saving', 'error');
    if (showNotification) showToast('Error saving canvas', 'error');
  }
}

// Helper function to get random position for new nodes
function getRandomPosition() {
  const x = 100 + Math.random() * 600;
  const y = 100 + Math.random() * 400;
  return `${x} ${y}`;
}

// Helper function to auto-layout nodes in a grid pattern
function getAutoLayoutPosition(index) {
  const cols = 4; // Number of columns
  const spacing = 220; // Space between nodes
  const offsetX = 100;
  const offsetY = 100;
  
  const col = index % cols;
  const row = Math.floor(index / cols);
  
  const x = offsetX + (col * spacing);
  const y = offsetY + (row * spacing);
  
  return `${x} ${y}`;
}

// Extract domain from URL
function extractDomain(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.substring(0, 30) + '...';
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `canvas-toast canvas-toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

// View bookmark in detail (could open modal or navigate to URL)
function viewBookmark(data) {
  if (data.bookmark && data.bookmark.url) {
    window.open(data.bookmark.url, '_blank');
  }
}

// Remove node from canvas (doesn't delete bookmark, just removes from canvas)
function removeNodeFromCanvas(data) {
  if (!diagram) return;
  diagram.startTransaction('remove node');
  const node = diagram.findNodeForKey(data.key);
  if (node) {
    diagram.remove(node);
  }
  diagram.commitTransaction('remove node');
}

// Export functions for use in app.js
window.canvasController = {
  initCanvas: initCanvas,
  loadCanvasData: loadCanvasData,
  saveCanvasData: saveCanvasData,
  isInitialized: function() {
    return diagram !== null;
  },
  getDiagram: function() {
    return diagram;
  }
};

console.log('Canvas controller loaded');
