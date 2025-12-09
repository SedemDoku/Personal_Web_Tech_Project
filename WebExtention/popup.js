// Extension popup - handles login and bookmark display
// API_BASE will be loaded from storage or use default
const DEFAULT_API_BASE = 'http://localhost/Personal_Web_Tech_Project/api';

let currentUser = null;
let bookmarks = [];
let API_BASE = DEFAULT_API_BASE;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Load API URL from storage
  const storage = await chrome.storage.local.get({ apiUrl: DEFAULT_API_BASE });
  API_BASE = storage.apiUrl || DEFAULT_API_BASE;
  
  // Check if user is logged in
  const authData = await chrome.storage.local.get(['user_email', 'user_id', 'user_username']);
  
  if (authData.user_id) {
    currentUser = {
      id: authData.user_id,
      email: authData.user_email,
      username: authData.user_username
    };
    showBookmarksView();
    await loadBookmarks();
  } else {
    showLoginView();
  }
  
  wireEvents();
}

function wireEvents() {
  // Login form
  const loginForm = document.getElementById('login-form');
  const loginPassword = document.getElementById('login-password');
  const togglePassword = document.querySelector('.toggle-password');
  const logoutBtn = document.getElementById('logout-btn');
  const signupLink = document.getElementById('signup-link');
  
  loginForm?.addEventListener('submit', handleLogin);
  
  togglePassword?.addEventListener('click', () => {
    const isPassword = loginPassword.type === 'password';
    loginPassword.type = isPassword ? 'text' : 'password';
    togglePassword.textContent = isPassword ? 'Hide' : 'Show';
  });
  
  logoutBtn?.addEventListener('click', handleLogout);
  
  signupLink?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'http://localhost/Personal_Web_Tech_Project/signup.html' });
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim();
  const password = form.password.value;
  
  const alert = document.getElementById('alert');
  
  if (!email || !password) {
    showAlert('Please enter email and password', 'error');
    return;
  }
  
  try {
    showAlert('Logging in...', 'success');
    
    // Note: Chrome extensions can't use credentials: 'include' for cookies
    // So we'll use a token-based approach or store credentials
    const response = await fetch(`${API_BASE}/auth.php?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store user info
      currentUser = {
        id: data.data.user_id,
        email: data.data.email,
        username: data.data.username
      };
      
      await chrome.storage.local.set({
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_username: currentUser.username,
        apiUrl: API_BASE
      });
      
      showAlert('Login successful!', 'success');
      setTimeout(() => {
        showBookmarksView();
        loadBookmarks();
      }, 500);
    } else {
      showAlert(data.error || 'Login failed', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showAlert('Connection error. Make sure your server is running.', 'error');
  }
}

async function handleLogout() {
  await chrome.storage.local.remove(['user_id', 'user_email', 'user_username']);
  currentUser = null;
  bookmarks = [];
  showLoginView();
}

function showLoginView() {
  document.getElementById('login-section').classList.remove('hidden');
  document.getElementById('bookmarks-section').classList.add('hidden');
  document.getElementById('login-form').reset();
}

function showBookmarksView() {
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('bookmarks-section').classList.remove('hidden');
  
  if (currentUser) {
    document.getElementById('user-info').textContent = currentUser.username || currentUser.email;
  }
}

async function loadBookmarks() {
  const listElement = document.getElementById('bookmark-list');
  const emptyMsg = document.getElementById('empty-msg');
  
  if (!currentUser) return;
  
  try {
    const response = await fetch(`${API_BASE}/bookmarks.php`, {
      headers: { 
        'Content-Type': 'application/json',
        'X-User-ID': currentUser.id.toString(),
        'X-User-Email': currentUser.email
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      bookmarks = data.data || [];
      listElement.innerHTML = '';
      
      if (bookmarks.length === 0) {
        emptyMsg.style.display = 'block';
        return;
      } else {
        emptyMsg.style.display = 'none';
      }
      
      bookmarks.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'item';
        
        const { icon, contentHtml } = renderContent(item);
        const tagsHtml = renderTags(item.tags || []);
        const favorite = item.favorite ? '⭐' : '';
        
        div.innerHTML = `
          <div class="item-head">
            <p class="item-title" title="${escapeHTML(item.title)}">${icon} ${escapeHTML(item.title)}</p>
            <span class="badge">${typeLabel(item.type)}</span>
          </div>
          <div class="item-content">
            ${contentHtml}
            ${tagsHtml}
          </div>
          <div class="meta-row">
            <span>${item.collection_name || 'Unsorted'} ${favorite}</span>
            <div class="actions">
              <a class="link" href="${item.url || item.content || '#'}" target="_blank">Open</a>
              <button class="delete-btn" data-id="${item.id}">Delete</button>
            </div>
          </div>
        `;
        
        listElement.appendChild(div);
      });
      
      // Add delete handlers
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          if (confirm('Delete this bookmark?')) {
            await deleteBookmark(e.target.dataset.id);
            await loadBookmarks();
          }
        });
      });
    } else {
      if (data.error && data.error.includes('Authentication')) {
        // Session expired, logout
        await handleLogout();
        showAlert('Session expired. Please login again.', 'error');
      } else {
        showAlert(data.error || 'Failed to load bookmarks', 'error');
      }
    }
  } catch (error) {
    console.error('Failed to load bookmarks:', error);
    showAlert('Failed to load bookmarks. Check your server connection.', 'error');
  }
}

async function deleteBookmark(id) {
  if (!currentUser) return false;
  
  try {
    const response = await fetch(`${API_BASE}/bookmarks.php?id=${id}`, {
      method: 'DELETE',
      headers: {
        'X-User-ID': currentUser.id.toString(),
        'X-User-Email': currentUser.email
      }
    });
    
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Failed to delete bookmark:', error);
    return false;
  }
}

function renderContent(item) {
  let icon = '🔗';
  let contentHtml = '';
  const mediaUrl = item.type === 'audio' || item.type === 'video' ? `http://localhost/Personal_Web_Tech_Project/api/media.php?f=${encodeURIComponent(item.content)}&user_id=${currentUser.id}&user_email=${currentUser.email}` : item.content;
  
  if (item.type === 'text') {
    icon = '📝';
    const snippet = item.content ? `"${escapeHTML(item.content.slice(0, 140))}${item.content.length > 140 ? '…' : ''}"` : '';
    contentHtml = snippet;
  } else if (item.type === 'image') {
    icon = '🖼️';
    contentHtml = `
      <img src="${escapeHTML(item.content)}" class="media-preview" onerror="this.style.display='none'">
      <div style="margin-top:4px;"><a class="link" href="${escapeHTML(item.content)}" target="_blank">View full</a></div>
    `;
  } else if (item.type === 'audio') {
    icon = '🎵';
    contentHtml = `<audio controls src="${escapeHTML(mediaUrl)}" class="media-preview"></audio>`;
  } else if (item.type === 'video') {
    icon = '📺';
    contentHtml = `<video controls src="${escapeHTML(mediaUrl)}" class="media-preview" style="max-width:100%; max-height:150px;"></video>`;
  } else {
    contentHtml = `<a class="link" href="${escapeHTML(item.url)}" target="_blank">${escapeHTML(item.url)}</a>`;
  }
  return { icon, contentHtml };
}

function renderTags(tags = []) {
  if (!tags.length) return '';
  return `<div class="tags">${tags.map(t => `<span class="tag">#${escapeHTML(t)}</span>`).join('')}</div>`;
}

function typeLabel(type) {
  switch (type) {
    case 'image': return 'Image';
    case 'audio': return 'Audio';
    case 'text': return 'Text';
    case 'video': return 'Video';
    default: return 'Link';
  }
}

function showAlert(message, type) {
  const alert = document.getElementById('alert');
  alert.textContent = message;
  alert.className = `alert ${type}`;
  alert.style.display = 'block';
  
  if (type === 'success') {
    setTimeout(() => {
      alert.style.display = 'none';
    }, 3000);
  }
}

function escapeHTML(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
