# Canvas Pin Board Feature - Implementation Guide

## Overview
A GoJS-based pin board canvas has been added to your bookmark manager, allowing users to visualize and organize bookmarks spatially with drag-and-drop and connection arrows.

## What's New

### 1. Database Schema Updates
**File: [`database.sql`](database.sql)**

Two new tables have been added:

- **`bookmark_canvas_positions`**: Stores X/Y coordinates for each bookmark on the canvas per collection
- **`bookmark_canvas_connections`**: Stores arrow connections between bookmarks with optional labels

**Migration**: Run the updated SQL file in phpMyAdmin to create these tables.

### 2. Frontend Components

#### a) HTML Structure
**File: [`index.php`](index.php)**

- Added GoJS library (v3.0.2) from CDN
- Added new "Canvas" view button with node-connection icon
- Added `<div id="canvas-container">` to hold the GoJS diagram
- Included `canvas.js` script

#### b) Canvas Controller
**File: [`canvas.js`](canvas.js)** (NEW)

Features:
- **Drag & Drop**: Bookmarks can be dragged anywhere on the canvas (snaps to grid)
- **Right-Click Linking**: Right-click and drag from one bookmark to another to create arrow connections
- **Node Display**: Shows bookmark title, type badge, and favorite status
- **Context Menus**: 
  - Nodes: View bookmark, remove from canvas
  - Links: Add/edit label, delete connection
- **Auto-save**: Changes are automatically saved to the database
- **Zoom & Pan**: Mouse wheel zoom, drag to pan

#### c) API Endpoint
**File: [`api/canvas.php`](api/canvas.php)** (NEW)

- **GET**: Fetch positions and connections for a collection
- **POST**: Save updated positions and connections
- Authentication via headers (same as other endpoints)

#### d) Styling
**File: [`style.css`](style.css)**

Added canvas-specific styles for container, responsive height, and button states.

### 3. Integration with Main App
**File: [`app.js`](app.js)**

Updated view toggle logic to:
- Call `window.canvasController.switchView('canvas')` when canvas button is clicked
- Hide/show appropriate containers
- Maintain existing grid and list view functionality

## How to Use

### Setup
1. Run the updated [`database.sql`](database.sql) file to create the new tables
2. Refresh your application

### User Experience
1. Navigate to any collection in your bookmark manager
2. Click the **Canvas** button (node-connection icon) in the view controls
3. Bookmarks will appear as draggable nodes on a grid
4. **Drag nodes** to reposition them
5. **Right-click and drag** from one bookmark to another to create a connection arrow
6. **Right-click nodes** for options (view bookmark, remove from canvas)
7. **Right-click arrows** to add labels or delete connections
8. **Zoom** with mouse wheel, **pan** by dragging empty space
9. All changes auto-save

### Creating Connections
- Right-click on a bookmark node
- While holding, drag to another bookmark
- Release to create the connection
- A directed arrow will appear between them

### Managing Connections
- Right-click on an arrow
- Select "Add Label" to annotate the relationship
- Click the label text to edit it
- Select "Delete Connection" to remove the arrow

## Technical Details

### GoJS Configuration
- Grid: 20x20px cells with snap-to-grid
- Undo/redo enabled
- Zoom with mouse wheel
- Smart routing (avoids nodes, jump-over crossings)

### Node Template
- Rounded rectangle with bookmark info
- Size: 180-220px wide, 80-120px tall
- Shows title (max 2 lines), type icon/badge
- Favorite bookmarks have orange border
- Selected nodes have yellow highlight

### Link Template
- Curved arrows with arrowheads
- Optional editable labels
- Can be re-routed by dragging endpoints
- Smart routing around nodes

### Data Persistence
- Positions and connections saved per collection
- User isolation (each user's canvas is separate)
- Auto-save on any change (debounced)
- Positions stored as decimal coordinates

## Files Modified/Created

| File | Status | Purpose |
|------|--------|---------|
| [`database.sql`](database.sql) | Modified | Added canvas tables |
| [`index.php`](index.php) | Modified | Added GoJS library, canvas container, button |
| [`canvas.js`](canvas.js) | NEW | GoJS diagram controller |
| [`api/canvas.php`](api/canvas.php) | NEW | Backend API for canvas data |
| [`app.js`](app.js) | Modified | Integrated canvas view toggle |
| [`style.css`](style.css) | Modified | Added canvas styling |

## Future Enhancements

Possible improvements:
- Export canvas as image (PNG/SVG)
- Different connection types (dashed, colored)
- Group nodes into clusters
- Minimap for large canvases
- Template layouts (auto-arrange)
- Collaborative editing
- Comments on connections

## GoJS License Note

GoJS is a commercial library. The version included (via CDN) is the evaluation version. For production use with many users, you may need to purchase a license from [gojs.net](https://gojs.net).

## Troubleshooting

**Canvas doesn't appear:**
- Check browser console for errors
- Verify GoJS library loaded (check Network tab)
- Ensure collection is selected

**Positions not saving:**
- Check [`api/canvas.php`](api/canvas.php) is accessible
- Verify database tables exist
- Check browser console for API errors

**Right-click linking not working:**
- Make sure you're right-clicking and dragging in one motion
- Start the drag on a bookmark node
- Release on another bookmark node

---

Enjoy organizing your bookmarks spatially! 🎨
