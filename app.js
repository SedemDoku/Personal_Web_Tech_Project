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
const currentCategoryTitle = document.querySelector(".current-category");
const collectionTitle = document.getElementById("collection-title");
const tagFilter = document.getElementById("tag-filter");
const addDemoBtn = document.getElementById("add-demo");
const collectionsList = document.getElementById("collections-list");
const newCollectionBtn = document.getElementById("new-collection-btn");
const logoutBtn = document.getElementById("logout-btn");

console.log('Element checks:');
console.log('addDemoBtn:', addDemoBtn);
console.log('newCollectionBtn:', newCollectionBtn);
console.log('logoutBtn:', logoutBtn);

init();

async function init() {
  console.log('Initializing app...');
  console.log('API_BASE:', API_BASE);
  await loadCollections();
  console.log('Collections loaded:', state.collections.length);
  await loadBookmarks();
  console.log('Bookmarks loaded:', state.bookmarks.length);
  wireEvents();
  console.log('Events wired');
  render();
  console.log('Initial render complete');
}

async function loadCollections() {
  try {
    const response = await fetch(`${API_BASE}/collections.php`, {
      credentials: 'include'
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
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.success) {
      state.bookmarks = data.data;
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
      loadBookmarks().then(() => render());
    });
    
    collectionsList.appendChild(li);
    
    if (collection.children && collection.children.length > 0) {
      collection.children.forEach(child => renderCollection(child, level + 1));
    }
  }
  
  state.collections.forEach(collection => renderCollection(collection));
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
      loadBookmarks().then(() => render());
    });
  });

  searchInput?.addEventListener("input", (e) => {
    state.search = e.target.value;
    loadBookmarks().then(() => render());
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
      // Redirect to login page with a flag to prevent auto-login
      window.location.href = 'login.html?action=logout';
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = 'login.html?action=logout';
    }
  });

  // View toggle buttons
  const viewButtons = document.querySelectorAll('.view-btn');
  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      viewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
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
    const bookmark = {
      title: formData.get('title'),
      url: formData.get('url') || '',
      type: formData.get('type'),
      content: formData.get('content') || formData.get('url') || '',
      collection_id: formData.get('collection_id') || null,
      tags: [],
      favorite: false
    };
    
    await createBookmark(bookmark);
    closeBookmarkModal();
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

    card.innerHTML = `
      <div class="media-preview">${media}</div>
      <div class="card-body">
        <h3 title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</h3>
        <p class="type-tag">${typeLabel(item.type)}</p>
        ${tags}
        <div class="card-footer">
          <a href="${item.url || item.content || "#"}" class="view-link" target="_blank">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            Open
          </a>
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

  renderTagFilter();
}

function renderMediaPreview(item) {
  if (item.type === "image") {
    return `<img src="${escapeHTML(item.content)}" alt="${escapeHTML(item.title)}" class="preview-img">`;
  }
  if (item.type === "audio") {
    const mediaUrl = `api/media.php?f=${encodeURIComponent(item.content)}`;
    return `<audio controls src="${escapeHTML(mediaUrl)}" class="preview-audio"></audio>`;
  }
  if (item.type === "text") {
    const snippet = item.content || item.description || "Text snippet";
    return `<p>${escapeHTML(snippet.slice(0, 120))}${snippet.length > 120 ? "..." : ""}</p>`;
  }
  if (item.type === "video") {
    const mediaUrl = `api/media.php?f=${encodeURIComponent(item.content)}`;
    return `<video controls src="${escapeHTML(mediaUrl)}" class="preview-video" style="max-width:100%; max-height:200px;"></video>`;
  }
  return `<span class="link-icon">🔗</span>`;
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
    case "text":
      return "Text";
    case "audio":
      return "Audio";
    case "image":
      return "Image";
    default:
      return "Link";
  }
}

function escapeHTML(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function createCollection(name, parentId = null) {
  try {
    const response = await fetch(`${API_BASE}/collections.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      credentials: 'include'
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
  state.collections.forEach(collection => {
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
  state.collections.forEach(collection => {
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
    const response = await fetch(`${API_BASE}/bookmarks.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(bookmark)
    });
    const data = await response.json();
    if (data.success) {
      await loadBookmarks();
      render();
    } else {
      alert(data.error || 'Failed to create bookmark');
    }
  } catch (error) {
    console.error("Failed to create bookmark:", error);
    alert('Failed to create bookmark');
  }
}
