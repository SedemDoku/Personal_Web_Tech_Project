// Extension popup - handles login and bookmark display
// API_BASE will be loaded from storage or use default

// Use browser namespace (works in both Firefox and Chrome with polyfill)
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const DEFAULT_API_BASE = 'http://169.239.251.102:341/~sedem.doku/Personal_Web_Tech_Project/api';

let currentUser = null;
let bookmarks = [];
let API_BASE = DEFAULT_API_BASE;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  injectPreviewStyles();
  // Load API URL from storage
  const storage = await browserAPI.storage.local.get({ apiUrl: DEFAULT_API_BASE });
  API_BASE = storage.apiUrl || DEFAULT_API_BASE;
  
  // Check if user is logged in
  const authData = await browserAPI.storage.local.get(['user_email', 'user_id', 'user_username']);
  
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
    browserAPI.tabs.create({ url: 'http://169.239.251.102:341/~sedem.doku/Personal_Web_Tech_Project/signup.html' });
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
    
    const response = await fetch(`${API_BASE}/auth.php?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store user info
      currentUser = {
        id: parseInt(data.data.user_id, 10),
        email: data.data.email,
        username: data.data.username
      };
      
      console.log('Storing user data:', currentUser);
      
      await browserAPI.storage.local.set({
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_username: currentUser.username,
        apiUrl: API_BASE
      });
      
      console.log('User data stored successfully');
      
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
  await browserAPI.storage.local.remove(['user_id', 'user_email', 'user_username']);
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
        
        const { contentHtml } = renderContent(item);
        const tagsHtml = renderTags(item.tags || []);
        const favorite = item.favorite ? '⭐' : '';
        
        div.innerHTML = `
          <div class="item-head">
            <p class="item-title" title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</p>
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

function renderContent(item) {
  let contentHtml = '';
  const domain = getDomain(item.url || item.content);
  const previewText = (item.description || item.content || item.url || '').slice(0, 120);

  if (item.type === 'text') {
    const snippet = item.content ? `"${escapeHTML(item.content.slice(0, 140))}${item.content.length > 140 ? '…' : ''}"` : '';
    contentHtml = snippet;
  } else if (item.type === 'video') {
    const videoId = extractYouTubeID(item.content);
    if (videoId) {
      contentHtml = `
        <div style="position:relative; padding-bottom:56.25%; height:0; border-radius:8px; overflow:hidden; margin:8px 0;">
          <iframe 
            style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;"
            src="https://www.youtube.com/embed/${videoId}" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        </div>
        <div><a class="link" href="${escapeHTML(item.content)}" target="_blank">Watch on YouTube</a></div>
      `;
    } else {
      contentHtml = `<a class="link" href="${escapeHTML(item.content)}" target="_blank">${escapeHTML(item.content)}</a>`;
    }
  } else if (item.type === 'image') {
    contentHtml = `
      <img src="${escapeHTML(item.content)}" class="media-preview" style="max-width:100%; border-radius:8px;">
      <div style="margin-top:4px;"><a class="link" href="${escapeHTML(item.content)}" target="_blank">View full</a></div>
    `;
  } else {
    contentHtml = `
      <div class="preview-box">
        <div class="preview-domain">${escapeHTML(domain || 'Link preview')}</div>
        ${previewText ? `<div class="preview-text">${escapeHTML(previewText)}${previewText.length === 120 ? '…' : ''}</div>` : ''}
        <a class="preview-open" href="${escapeHTML(item.url)}" target="_blank">Open</a>
      </div>
    `;
  }
    return { contentHtml };
}

function getDomain(url = '') {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_err) {
    return '';
  }
}

function renderTags(tags = []) {
  if (!tags.length) return '';
  return `<div class="tags">${tags.map(t => `<span class="tag">#${escapeHTML(t)}</span>`).join('')}</div>`;
}

function typeLabel(type) {
  switch (type) {
    case 'video': return 'Video';
    case 'image': return 'Image';
    case 'text': return 'Text';
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

function injectPreviewStyles() {
  if (document.getElementById('previewbox-styles')) return;
  const style = document.createElement('style');
  style.id = 'previewbox-styles';
  style.textContent = `
    .preview-box {
      background: #f5f6f8;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 8px 10px;
      margin-top: 6px;
    }
    .preview-domain {
      font-size: 12px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .preview-text {
      font-size: 12px;
      color: #4b5563;
      margin: 0 0 6px;
      line-height: 1.5;
    }
    .preview-open {
      font-size: 12px;
      color: #ff6b35;
      font-weight: 600;
      text-decoration: none;
    }
    .preview-open:hover { text-decoration: underline; }
  `;
  document.head.appendChild(style);
}
