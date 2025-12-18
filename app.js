const USER_STORAGE_KEY = 'appUser';

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to parse stored user', err);
    return null;
  }
}
let previewBoxLoaded = false;

function clearStoredUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
}
let currentUser = null;
// Bookmark Manager - PHP/MySQL Backend Integration
// API_BASE is defined in index.php as a global variable

const state = {
  bookmarks: [],
  collections: [],
  search: "",
  collectionId: null,
  collectionName: "All",
  tag: null,
};

const bookmarkGrid = document.getElementById("bookmark-grid");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const currentCategoryTitle = document.querySelector(".current-category");
const collectionTitle = document.getElementById("collection-title");
const tagFilter = document.getElementById("tag-filter");
const addDemoBtn = document.getElementById("add-demo");
const collectionsList = document.getElementById("collections-list");
const newCollectionBtn = document.getElementById("new-collection-btn");
const logoutBtn = document.getElementById("logout-btn");
const cookieAcceptBtn = document.getElementById("cookie-accept-btn");
const cookieDeclineBtn = document.getElementById("cookie-decline-btn");

console.log('Element checks:');
console.log('addDemoBtn:', addDemoBtn);
console.log('newCollectionBtn:', newCollectionBtn);
console.log('logoutBtn:', logoutBtn);
console.log('searchButton:', searchButton);
console.log('searchInput:', searchInput);

// Initialize cookie consent dialog
if (cookieAcceptBtn) {
  cookieAcceptBtn.addEventListener("click", () => {
    CookieManager.acceptCookies();
  });
}

if (cookieDeclineBtn) {
  cookieDeclineBtn.addEventListener("click", () => {
    CookieManager.declineCookies();
  });
}

// Show cookie consent dialog on page load if needed
window.addEventListener("load", () => {
  CookieManager.showConsentDialogIfNeeded();
});

init();

async function init() {
  console.log('Initializing app...');
  console.log('API_BASE:', API_BASE);
  currentUser = getStoredUser();
  if (!currentUser) {
    window.location.href = 'login.html?error=session_expired';
    return;
  }
  
  // Load user information first
  const user = await loadUser();
  if (!user) {
    window.location.href = 'login.html?error=session_expired';
    return;
  }
  currentUser = { ...currentUser, ...user };
  
  // Update UI with user info
  const usernameDisplay = document.getElementById('username-display');
  if (usernameDisplay) {
    usernameDisplay.textContent = user.username;
  }
  
  await loadCollections();
  console.log('Collections loaded:', state.collections.length);
  await loadBookmarks();
  console.log('Bookmarks loaded:', state.bookmarks.length);
  wireEvents();
  console.log('Events wired');
  render();
  console.log('Initial render complete');
}

async function loadUser() {
  try {
    const response = await fetch(`${API_BASE}/auth.php?action=user`, {
      credentials: 'include',
      headers: {
        'X-User-ID': currentUser.user_id,
        'X-User-Email': currentUser.email
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    if (data.success) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.error("Failed to load user:", error);
    return null;
  }
}

async function loadCollections() {
  try {
    const response = await fetch(`${API_BASE}/collections.php`, {
      credentials: 'include',
      headers: {
        'X-User-ID': currentUser.user_id,
        'X-User-Email': currentUser.email
      }
    });
    const data = await response.json();
    
    if (data.success) {
      state.collections = data.data;
      renderCollections();
    } else {
      // Handle authentication errors
      if (response.status === 401 || data.error?.includes('Authentication')) {
        window.location.href = 'login.html?error=session_expired';
        return;
      }
      console.error("Failed to load collections:", data.error);
    }
  } catch (error) {
    console.error("Failed to load collections:", error);
    if (error.message.includes('401') || error.message.includes('Authentication')) {
      window.location.href = 'login.html?error=session_expired';
    }
  }
}

async function loadBookmarks() {
  try {
    let url = `${API_BASE}/bookmarks.php`;
    const params = new URLSearchParams();
    if (state.collectionId) params.append('collection_id', state.collectionId);
    if (state.search) params.append('search', state.search);
    if (state.tag) params.append('tag', state.tag);
    if (params.toString()) url += '?' + params.toString();
    
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'X-User-ID': currentUser.user_id,
        'X-User-Email': currentUser.email
      }
    });
    const data = await response.json();
    
    console.log('Loaded bookmarks from API:', data);
    
    if (data.success) {
      state.bookmarks = data.data;
      console.log('First bookmark in state:', state.bookmarks[0]);
    } else {
      // Handle authentication errors
      if (response.status === 401 || data.error?.includes('Authentication')) {
        window.location.href = 'login.html?error=session_expired';
        return;
      }
      console.error("Failed to load bookmarks:", data.error);
    }
  } catch (error) {
    console.error("Failed to load bookmarks:", error);
    // On network error, check if it's an auth issue
    if (error.message.includes('401') || error.message.includes('Authentication')) {
      window.location.href = 'login.html?error=session_expired';
    }
  }
}

function renderCollections() {
  if (!collectionsList) return;
  
  collectionsList.innerHTML = '';
  
  function renderCollection(collection, level = 0) {
    const li = document.createElement('li');
    li.className = 'category-item';
    li.style.paddingLeft = `${level * 20 + 10}px`;
    li.dataset.collectionId = collection.id;
    li.textContent = collection.name;
    
    const count = document.createElement('span');
    count.className = 'pill';
    count.textContent = collection.bookmark_count || 0;
    li.appendChild(count);
    
    li.addEventListener('click', () => {
      document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
      li.classList.add('active');
      state.collectionId = collection.id;
      state.collectionName = collection.name;
      
      // Explicitly hide canvas and switch to grid view
      const canvasContainer = document.getElementById('canvas-container');
      const gridViewBtn = document.querySelector('.view-btn[data-view="grid"]');
      
      canvasContainer.style.display = 'none';
      if (gridViewBtn && !gridViewBtn.classList.contains('active')) {
        gridViewBtn.click();
      }
      
      loadBookmarks().then(() => render());
    });
    
    collectionsList.appendChild(li);
    
    if (collection.children && collection.children.length > 0) {
      collection.children.forEach(child => renderCollection(child, level + 1));
    }
  }
  
  state.collections
    .filter(col => !isUnsortedName(col.name))
    .forEach(collection => renderCollection(collection));
}

function wireEvents() {
  // All bookmarks
  document.querySelectorAll('.category-item[data-collection]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      const collectionId = item.dataset.collection;
      state.collectionId = collectionId === '' || collectionId === 'unsorted' ? null : collectionId;
      state.collectionName = item.textContent.trim().split(' ')[0];
      state.tag = null;
      
      // Explicitly hide canvas and switch to grid view
      const canvasContainer = document.getElementById('canvas-container');
      const gridViewBtn = document.querySelector('.view-btn[data-view="grid"]');
      
      canvasContainer.style.display = 'none';
      if (gridViewBtn && !gridViewBtn.classList.contains('active')) {
        gridViewBtn.click();
      }
      
      loadBookmarks().then(() => render());
    });
  });

  searchInput?.addEventListener("input", (e) => {
    state.search = e.target.value;
    console.log('Search input changed:', state.search);
    loadBookmarks().then(() => render());
  });

  searchButton?.addEventListener("click", (e) => {
    e.preventDefault();
    console.log('Search button clicked, searching for:', searchInput.value);
    state.search = searchInput.value;
    loadBookmarks().then(() => render());
  });

  // Allow Enter key to trigger search
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      console.log('Enter key pressed, searching for:', searchInput.value);
      state.search = searchInput.value;
      loadBookmarks().then(() => render());
    }
  });

  addDemoBtn?.addEventListener("click", () => {
    console.log('Add Bookmark button clicked');
    openBookmarkModal();
  });
  
  newCollectionBtn?.addEventListener("click", () => {
    console.log('New Collection button clicked');
    openCollectionModal();
  });
  
  logoutBtn?.addEventListener("click", async () => {
    console.log('Logout button clicked');
    try {
      const response = await fetch(`${API_BASE}/auth.php?action=logout`, {
        method: 'POST',
        credentials: 'include'
      });
      console.log('Logout response:', response.status);
      const data = await response.json();
      console.log('Logout data:', data);
      clearStoredUser();
      // Redirect to home page
      window.location.href = 'home.html';
    } catch (error) {
      console.error("Logout error:", error);
      clearStoredUser();
      window.location.href = 'home.html';
    }
  });

  // View toggle buttons
  const viewButtons = document.querySelectorAll('.view-btn');
  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      
      viewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const canvasContainer = document.getElementById('canvas-container');
      const bookmarkGrid = document.getElementById('bookmark-grid');
      const emptyState = document.getElementById('empty-state');
      
      if (view === 'canvas') {
        // Show canvas view
        bookmarkGrid.style.display = 'none';
        emptyState.style.display = 'none';
        canvasContainer.style.display = 'flex';
        
        // Initialize diagram if not already done
        if (window.canvasController) {
          if (!window.canvasController.isInitialized()) {
            window.canvasController.initCanvas();
          }
          // Always reload canvas data (will fetch fresh data if collection changed)
          window.canvasController.loadCanvasData();
        } else {
          console.error('Canvas controller not loaded - make sure canvas.js is included');
        }
      } else {
        // Show grid or list view
        canvasContainer.style.display = 'none';
        bookmarkGrid.style.display = view === 'list' ? 'block' : 'grid';
        
        if (view === 'list') {
          bookmarkGrid.classList.add('list-view');
          document.querySelectorAll('.bookmark-card').forEach(card => {
            card.classList.add('list-view');
          });
        } else {
          bookmarkGrid.classList.remove('list-view');
          document.querySelectorAll('.bookmark-card').forEach(card => {
            card.classList.remove('list-view');
          });
        }
      }
    });
  });

  // Empty state add button
  const addEmptyBtn = document.getElementById('add-empty-btn');
  if (addEmptyBtn) {
    addEmptyBtn.addEventListener('click', () => {
      openBookmarkModal();
    });
  }

  // Modal close buttons
  document.getElementById('bookmark-modal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close') || e.target.id === 'bookmark-cancel') {
      closeBookmarkModal();
    }
  });

  document.getElementById('collection-modal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-close') || e.target.id === 'collection-cancel') {
      closeCollectionModal();
    }
  });

  // Modal form submissions
  document.getElementById('bookmark-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url') || '';
    const type = formData.get('type');
    const contentValue = formData.get('content') || '';
    
    const bookmark = {
      title: formData.get('title'),
      url: url,
      type: type,
      content: type === 'video' || type === 'image' ? (url || contentValue) : contentValue,
      description: contentValue,
      collection_id: formData.get('collection_id') || null,
      tags: [],
      favorite: false
    };
    
    console.log('Creating bookmark:', bookmark);
    
    await createBookmark(bookmark);
    closeBookmarkModal();
  });

  // Auto-detect YouTube URLs and set type to video
  document.getElementById('bookmark-url')?.addEventListener('input', (e) => {
    const url = e.target.value;
    const typeSelect = document.getElementById('bookmark-type');
    const contentField = document.getElementById('bookmark-content');
    
    if (isYouTubeURL(url)) {
      typeSelect.value = 'video';
      if (!contentField.value) {
        contentField.value = url;
      }
    }
  });

  document.getElementById('collection-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const parentId = formData.get('parent_id');
    
    await createCollection(name, parentId ? parseInt(parentId) : null);
    closeCollectionModal();
  });
}

function render() {
  if (!bookmarkGrid) return;
  
  bookmarkGrid.innerHTML = "";
  
  if (currentCategoryTitle) {
    currentCategoryTitle.textContent = state.collectionName;
  }
  if (collectionTitle) {
    collectionTitle.textContent = state.collectionName === "All" ? "All Bookmarks" : state.collectionName;
  }

  // Update bookmark count
  const bookmarkCount = document.getElementById('bookmark-count');
  if (bookmarkCount) {
    bookmarkCount.textContent = `${state.bookmarks.length} ${state.bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}`;
  }

  // Show/hide empty state
  const emptyState = document.getElementById('empty-state');
  if (emptyState) {
    if (state.bookmarks.length === 0) {
      emptyState.style.display = 'block';
      bookmarkGrid.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      bookmarkGrid.style.display = 'grid';
    }
  }

  if (state.bookmarks.length === 0) {
    renderTagFilter();
    return;
  }

  state.bookmarks.forEach((item) => {
    const card = document.createElement("div");
    const viewMode = bookmarkGrid.classList.contains('list-view') ? 'list-view' : '';
    card.className = `bookmark-card bookmark-${item.type || "link"} ${viewMode}`;

    const media = renderMediaPreview(item);
    const tags = renderTags(item.tags || []);
    
    // Debug logging
    console.log('Rendering bookmark:', { id: item.id, title: item.title, description: item.description, content: item.content });

    const isTextBookmark = item.type === 'text';
    const isMediaBookmark = item.type === 'image' || item.type === 'video';
    const viewHref = (isTextBookmark || isMediaBookmark) ? '#' : (item.url || item.content || "#");
    const viewClass = isTextBookmark
      ? 'view-link view-link-text'
      : isMediaBookmark
      ? 'view-link view-link-media'
      : 'view-link';
    const viewTarget = (isTextBookmark || isMediaBookmark) ? '' : 'target="_blank"';

    card.innerHTML = `
      <div class="media-preview">${media}</div>
      <div class="card-body">
        <h3 title="${escapeHTML(item.title || 'Untitled')}">${escapeHTML(item.title || 'Untitled')}</h3>
        <p class="type-tag">${typeLabel(item.type)}</p>
        ${item.description ? `<p class="card-description">${escapeHTML(item.description)}</p>` : ''}
        ${tags}
        <div class="card-footer">
            <a href="${viewHref}" class="${viewClass}" ${viewTarget} data-id="${item.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            Open
          </a>
          <a href="#" class="move-collection" data-id="${item.id}" data-collection-id="${item.collection_id || ''}">Change collection</a>
          <button class="delete-bookmark" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `;
    bookmarkGrid.appendChild(card);
  });

  // Add delete handlers
  document.querySelectorAll('.delete-bookmark').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (confirm('Delete this bookmark?')) {
        await deleteBookmark(e.target.dataset.id);
        await loadBookmarks();
        render();
      }
    });
  });

  // Add move-to-collection handlers
  document.querySelectorAll('.move-collection').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = e.target.dataset.id;
      const currentCollectionId = e.target.dataset.collectionId || null;
      const bookmark = state.bookmarks.find(b => String(b.id) === String(id));
      if (bookmark) openMoveCollectionModal(bookmark, currentCollectionId);
    });
  });

  // Text preview modal handlers
  document.querySelectorAll('.view-link-text').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = e.currentTarget.dataset.id;
      const bookmark = state.bookmarks.find(b => String(b.id) === String(id));
      if (bookmark) openTextPreviewModal(bookmark);
    });
  });

  // Media (image/video) preview handlers
  document.querySelectorAll('.view-link-media').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = e.currentTarget.dataset.id;
      const bookmark = state.bookmarks.find(b => String(b.id) === String(id));
      if (bookmark) openMediaPreviewModal(bookmark);
    });
  });

  renderTagFilter();
}

// YouTube URL detection and ID extraction
function isYouTubeURL(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];
  return patterns.some(pattern => pattern.test(url));
}

function extractYouTubeID(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function renderMediaPreview(item) {
  if (item.type === "video") {
    const videoId = extractYouTubeID(item.content);
    if (videoId) {
      return `<div class="video-preview">
        <iframe 
          width="100%" 
          height="200" 
          src="https://www.youtube.com/embed/${videoId}" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      </div>`;
    } else if (item.content) {
      // Non-YouTube video (direct video link)
      return `<video class="video-preview" width="100%" height="200" controls preload="metadata">
        <source src="${escapeHTML(item.content)}" type="video/mp4">
        Your browser does not support the video tag.
      </video>`;
    }
    return `<span class="link-icon">🎥</span>`;
  }
  if (item.type === "image") {
    return `<img src="${escapeHTML(item.content)}" alt="${escapeHTML(item.title)}" class="preview-img">`;
  }
  if (item.type === "text") {
    const snippet = item.content || item.description || "Text snippet";
    return `<p>${escapeHTML(snippet.slice(0, 120))}${snippet.length > 120 ? "..." : ""}</p>`;
  }
  const href = item.url || item.content || '';
  if (!href) return `<span class="link-icon">🔗</span>`;
  const pbStyle = '--pb-background-color: #595959; --pb-background-color-hover: #4a4a4a; --pb-text-color: white; --pb-text-color-light: #ffffff;';
  return `<previewbox-article style="${pbStyle}" href="${escapeAttribute(href)}"></previewbox-article>`;
}

function renderTags(tags = []) {
  if (!tags.length) return "";
  return `<div class="tag-row">${tags
    .map((t) => `<span class="tag">${t}</span>`)
    .join("")}</div>`;
}

function renderTagFilter() {
  if (!tagFilter) return;
  
  const tags = Array.from(
    new Set(state.bookmarks.flatMap((b) => b.tags || []))
  );
  tagFilter.innerHTML = "";
  tags.forEach((tag) => {
    const el = document.createElement("button");
    el.className = "tag-chip";
    el.textContent = `#${tag}`;
    if (state.tag === tag) el.classList.add("active");
    el.addEventListener("click", async () => {
      state.tag = state.tag === tag ? null : tag;
      await loadBookmarks();
      render();
    });
    tagFilter.appendChild(el);
  });
}

function typeLabel(type) {
  switch (type) {
    case "video":
      return "Video";
    case "image":
      return "Image";
    case "text":
      return "Text";
    default:
      return "Link";
  }
}

function isUnsortedName(name = '') {
  return name.trim().toLowerCase() === 'unsorted';
}

function flattenCollections(list = [], prefix = '') {
  let result = [];
  list.forEach(col => {
    if (isUnsortedName(col.name)) return;
    result.push({ id: col.id, name: `${prefix}${col.name}` });
    if (col.children && col.children.length) {
      result = result.concat(flattenCollections(col.children, `${prefix}${col.name} / `));
    }
  });
  return result;
}

function openMoveCollectionModal(bookmark, currentCollectionId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  const collections = flattenCollections(state.collections);
  const options = ['<option value="">Unsorted</option>', ...collections.map(c => `<option value="${c.id}" ${String(c.id) === String(currentCollectionId || '') ? 'selected' : ''}>${escapeHTML(c.name)}</option>`)].join('');
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Move Bookmark</h2>
        <button type="button" class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-form">
        <div class="form-field">
          <label class="form-label" for="move-collection">Select collection</label>
          <select class="form-input" id="move-collection">${options}</select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="move-cancel">Cancel</button>
          <button type="button" class="btn-primary" id="move-save">Save</button>
        </div>
      </div>
    </div>
  `;

  const close = () => modal.remove();
  modal.querySelector('.modal-overlay').addEventListener('click', close);
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.querySelector('#move-cancel').addEventListener('click', close);
  modal.querySelector('#move-save').addEventListener('click', async () => {
    const select = modal.querySelector('#move-collection');
    const newCollectionId = select.value || null;
    await updateBookmarkCollection(bookmark.id, newCollectionId);
    close();
  });

  document.body.appendChild(modal);
}

function openTextPreviewModal(bookmark) {
  const modal = document.createElement('div');
  modal.className = 'modal text-preview-modal';
  const linkTarget = bookmark.url || bookmark.content || '';

  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content text-preview-content">
      <div class="modal-header">
        <span aria-hidden="true"></span>
        <button type="button" class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="text-preview-body">
        <div class="text-preview-full">${escapeHTML(bookmark.content || '')}</div>
        <div class="text-preview-actions">
          ${linkTarget ? `<a class="btn-link" href="${escapeHTML(linkTarget)}" target="_blank" rel="noopener">Open link</a>` : '<span class="no-link">No link available</span>'}
        </div>
      </div>
    </div>
  `;

  const close = () => modal.remove();
  modal.querySelector('.modal-overlay').addEventListener('click', close);
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  document.body.appendChild(modal);
  modal.focus?.();
}

function openMediaPreviewModal(bookmark) {
  const modal = document.createElement('div');
  modal.className = 'modal media-preview-modal';
  const linkTarget = bookmark.url || bookmark.content || '';
  const isVideo = bookmark.type === 'video';
  const isImage = bookmark.type === 'image';

  let mediaHtml = '';
  if (isVideo) {
    const videoId = extractYouTubeID(linkTarget);
    if (videoId) {
      mediaHtml = `
        <div class="media-preview-embed video-embed">
          <iframe
            src="https://www.youtube.com/embed/${videoId}"
            title="Video preview"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen></iframe>
        </div>`;
    } else if (linkTarget) {
      mediaHtml = `<video class="media-preview-embed" src="${escapeHTML(linkTarget)}" controls preload="metadata"></video>`;
    }
  } else if (isImage && linkTarget) {
    mediaHtml = `<img class="media-preview-embed" src="${escapeHTML(linkTarget)}" alt="Image preview">`;
  }

  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content media-preview-content">
      <div class="modal-header">
        <span aria-hidden="true"></span>
        <button type="button" class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="media-preview-body">
        ${mediaHtml || '<div class="no-link">No preview available</div>'}
        <div class="media-preview-actions">
          ${linkTarget ? `<a class="btn-link" href="${escapeHTML(linkTarget)}" target="_blank" rel="noopener">Open link</a>` : '<span class="no-link">No link available</span>'}
        </div>
      </div>
    </div>
  `;

  const close = () => modal.remove();
  modal.querySelector('.modal-overlay').addEventListener('click', close);
  modal.querySelector('.modal-close').addEventListener('click', close);
  modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  document.body.appendChild(modal);
  modal.focus?.();
}

async function updateBookmarkCollection(bookmarkId, collectionId) {
  try {
    const response = await fetch(`${API_BASE}/bookmarks.php?id=${bookmarkId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': currentUser.user_id,
        'X-User-Email': currentUser.email
      },
      body: JSON.stringify({ collection_id: collectionId })
    });
    const data = await response.json();
    if (data.success) {
      await loadBookmarks();
      render();
    } else {
      alert(data.error || 'Failed to move bookmark');
    }
  } catch (err) {
    console.error('Failed to move bookmark', err);
    alert('Failed to move bookmark');
  }
}

function ensurePreviewBoxLoaded() {
  if (previewBoxLoaded) return;
  if (document.querySelector('script[data-previewbox]')) {
    previewBoxLoaded = true;
    return;
  }
  const script = document.createElement('script');
  // Use CDN build of PreviewBox (non-module)
  script.src = 'https://cdn.jsdelivr.net/npm/@mariusbongarts/previewbox/dist/index.min.js';
  script.dataset.previewbox = 'true';
  script.onload = () => { previewBoxLoaded = true; };
  script.onerror = () => { console.warn('PreviewBox failed to load'); };
  document.head.appendChild(script);
}

function escapeHTML(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttribute(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function createCollection(name, parentId = null) {
  try {
    const response = await fetch(`${API_BASE}/collections.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': currentUser.user_id,
        'X-User-Email': currentUser.email
      },
      credentials: 'include',
      body: JSON.stringify({ name, parent_id: parentId })
    });
    const data = await response.json();
    if (data.success) {
      await loadCollections();
      render();
    } else {
      alert(data.error || 'Failed to create collection');
    }
  } catch (error) {
    console.error("Failed to create collection:", error);
    alert('Failed to create collection');
  }
}

async function deleteBookmark(id) {
  try {
    const response = await fetch(`${API_BASE}/bookmarks.php?id=${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'X-User-ID': currentUser.user_id,
        'X-User-Email': currentUser.email
      }
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Failed to delete bookmark:", error);
    return false;
  }
}

function openBookmarkModal() {
  const modal = document.getElementById('bookmark-modal');
  const collectionSelect = document.getElementById('bookmark-collection');
  
  // Populate collection options
  collectionSelect.innerHTML = '<option value="">Unsorted</option>';
  state.collections.filter(col => !isUnsortedName(col.name)).forEach(collection => {
    const option = document.createElement('option');
    option.value = collection.id;
    option.textContent = collection.name;
    collectionSelect.appendChild(option);
  });
  
  // Set current collection if viewing one
  if (state.collectionId) {
    collectionSelect.value = state.collectionId;
  }
  
  modal.classList.remove('hidden');
  document.getElementById('bookmark-title').focus();
}

function closeBookmarkModal() {
  const modal = document.getElementById('bookmark-modal');
  modal.classList.add('hidden');
  document.getElementById('bookmark-form').reset();
}

function openCollectionModal() {
  const modal = document.getElementById('collection-modal');
  const parentSelect = document.getElementById('collection-parent');
  
  // Populate parent collection options
  parentSelect.innerHTML = '<option value="">None</option>';
  state.collections.filter(col => !isUnsortedName(col.name)).forEach(collection => {
    const option = document.createElement('option');
    option.value = collection.id;
    option.textContent = collection.name;
    parentSelect.appendChild(option);
  });
  
  modal.classList.remove('hidden');
  document.getElementById('collection-name').focus();
}

function closeCollectionModal() {
  const modal = document.getElementById('collection-modal');
  modal.classList.add('hidden');
  document.getElementById('collection-form').reset();
}

async function createBookmark(bookmark) {
  try {
    console.log('Sending bookmark to API:', bookmark);
    const response = await fetch(`${API_BASE}/bookmarks.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': currentUser.user_id,
        'X-User-Email': currentUser.email
      },
      credentials: 'include',
      body: JSON.stringify(bookmark)
    });
    const data = await response.json();
    console.log('API Response:', data);
    if (data.success) {
      await loadBookmarks();
      render();
    } else {
      console.error('Create bookmark failed:', data.error);
      alert(data.error || 'Failed to create bookmark');
    }
  } catch (error) {
    console.error("Failed to create bookmark:", error);
    alert('Failed to create bookmark');
  }
}

// Expose modal functions globally for canvas.js to use
window.openMediaPreviewModal = openMediaPreviewModal;
window.openTextPreviewModal = openTextPreviewModal;
