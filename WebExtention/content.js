// Content script: renders an in-page modal to collect bookmark metadata.
// Triggered by background.js via message "OPEN_MODAL".

let currentModal;
let userCollections = [];

console.log('Content script loaded');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Message received:', message.type);
  if (message.type === "OPEN_MODAL") {
    const data = message.payload;
    // Load collections before opening modal
    loadCollections().then(() => {
      openModal(data);
      sendResponse({ ok: true });
    }).catch(error => {
      console.error('Error in loadCollections:', error);
      openModal(data);
      sendResponse({ ok: true });
    });
    return true; // Keep the channel open for async response
  }
});

async function loadCollections() {
  try {
    const result = await chrome.storage.local.get(['apiUrl', 'user_id', 'user_email']);
    
    // Default apiUrl if not in storage
    const apiUrl = result.apiUrl || 'http://169.239.251.102:341/~sedem.doku/Personal_Web_Tech_Project/api';
    
    if (!result.user_id || !result.user_email) {
      console.log('No user logged in');
      return;
    }
    
    const response = await fetch(`${apiUrl}/collections.php`, {
      headers: {
        'X-User-ID': result.user_id.toString(),
        'X-User-Email': result.user_email
      }
    });
    
    const data = await response.json();
    if (data.success && data.data) {
      // Flatten the collection tree
      userCollections = flattenCollections(data.data);
      console.log('Collections loaded:', userCollections);
    }
  } catch (error) {
    console.error('Failed to load collections:', error);
  }
}

function flattenCollections(collections, prefix = '') {
  let result = [];
  collections.forEach(col => {
    result.push({
      id: col.id,
      name: col.name,
      displayName: prefix + col.name
    });
    if (col.children && col.children.length > 0) {
      result = result.concat(flattenCollections(col.children, prefix + col.name + ' / '));
    }
  });
  return result;
}

function openModal(data) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.id = "bookmark-overlay";
  overlay.innerHTML = modalTemplate(data);
  document.body.appendChild(overlay);

  // Wire events
  overlay.querySelector("#bm-cancel").onclick = closeModal;
  overlay.querySelector("#bm-close").onclick = closeModal;
  overlay.querySelector("#bm-form").onsubmit = onSubmit;

  currentModal = overlay;
}

function closeModal() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
  }
}

function onSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const collectionValue = form.collection.value;
  const urlValue = form.url.value || form.content.value || "";
  const rawTitle = form.querySelector('[name="title"]')?.value?.trim() || "";
  const finalTitle = rawTitle || deriveTitleFromUrl(urlValue);
  
  // Find the collection ID
  let collectionId = null;
  if (collectionValue) {
    const collection = userCollections.find(c => c.id.toString() === collectionValue);
    if (collection) {
      collectionId = collection.id;
    }
  }
  
  const payload = {
    title: finalTitle,
    description: form.description.value,
    collection_id: collectionId,
    tags: form.tags.value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    url: form.url.value,
    favorite: form.favorite.checked,
    type: form.type.value,
    content: form.content.value,
    date: new Date().toLocaleString(),
  };

  // Show saving status
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;

  chrome.runtime.sendMessage(
    { type: "SAVE_BOOKMARK", payload },
    (response) => {
      if (response && response.ok) {
        console.log('Bookmark saved successfully');
        closeModal();
      } else {
        console.error('Failed to save bookmark');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        alert('Failed to save bookmark. Please try again.');
      }
    }
  );
}

function deriveTitleFromUrl(urlValue) {
  if (!urlValue) return "Untitled";
  try {
    const parsed = new URL(urlValue);
    if (parsed.hostname) return parsed.hostname;
    return urlValue;
  } catch (_err) {
    return urlValue || "Untitled";
  }
}

function modalTemplate(data) {
  const tagValue = (data.tags || []).join(", ");
  const urlValue = data.url || data.content || "";
  let titleValue = data.title || "";
  if (!titleValue && urlValue) {
    try {
      const parsed = new URL(urlValue);
      titleValue = parsed.hostname;
    } catch (_err) {
      titleValue = urlValue;
    }
  }
  return `
  <style>
    #bookmark-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 2147483647;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 40px 12px;
      box-sizing: border-box;
    }
    #bookmark-modal {
      width: min(420px, 100%);
      background: #1f1f21;
      color: #f5f5f5;
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.4);
      padding: 18px;
      font-family: "Segoe UI", system-ui, sans-serif;
      position: relative;
      border: 1px solid #2e2e34;
    }
    #bookmark-modal h3 {
      margin: 0 0 12px;
      font-size: 18px;
    }
    #bm-close {
      position: absolute;
      top: 10px;
      right: 12px;
      border: none;
      background: transparent;
      color: #bbb;
      font-size: 18px;
      cursor: pointer;
    }
    .bm-field { margin-bottom: 12px; }
    .bm-label { display: block; margin-bottom: 6px; color: #c9c9cf; font-size: 13px; }
    .bm-input, .bm-select, .bm-textarea {
      width: 100%;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #3a3a41;
      background: #2a2a30;
      color: #f5f5f5;
      font-size: 13px;
      box-sizing: border-box;
    }
    .bm-textarea { min-height: 60px; resize: vertical; }
    .bm-row { display: flex; gap: 8px; align-items: center; }
    .bm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 14px;
    }
    .bm-btn {
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
    }
    #bm-cancel { background: #3a3a41; color: #e5e5e5; }
    #bm-save { background: #d0a66b; color: #1f1f21; }
    .bm-checkbox { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #c9c9cf; }
    .bm-chip-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .bm-chip {
      padding: 6px 8px;
      background: #2f2f36;
      border-radius: 8px;
      font-size: 12px;
      border: 1px solid #3b3b42;
    }
    .bm-badge { padding: 4px 6px; background: #2b2b31; border-radius: 6px; font-size: 12px; border: 1px solid #3b3b42; }
  </style>
  <div id="bookmark-modal">
    <button id="bm-close" aria-label="Close">✕</button>
    <h3>New bookmark</h3>
    <form id="bm-form">
      <div class="bm-field">
        <label class="bm-label">Title</label>
        <input class="bm-input" name="title" value="${escapeHTML(
          titleValue || ""
        )}" required />
      </div>
      <div class="bm-field">
        <label class="bm-label">Description</label>
        <textarea class="bm-textarea" name="description" placeholder="Add notes..."></textarea>
      </div>
      <div class="bm-field bm-row">
        <div style="flex:1">
          <label class="bm-label">Collection</label>
          <select class="bm-select" name="collection">
            <option value="">Unsorted</option>
            ${userCollections.map(col => `<option value="${col.id}">${escapeHTML(col.displayName)}</option>`).join('')}
          </select>
        </div>
        <span class="bm-badge">${typeLabel(data.type)}</span>
        <input type="hidden" name="type" value="${escapeHTML(data.type)}" />
        <input type="hidden" name="content" value="${escapeHTML(
          data.content || ""
        )}" />
      </div>
      <div class="bm-field">
        <label class="bm-label">Tags (comma separated)</label>
        <input class="bm-input" name="tags" value="${escapeHTML(tagValue)}" placeholder="design, ui, inspiration" />
      </div>
      <div class="bm-field">
        <label class="bm-label">URL</label>
        <input class="bm-input" name="url" value="${escapeHTML(urlValue)}" />
      </div>
      <div class="bm-field bm-checkbox">
        <input type="checkbox" id="favorite" name="favorite" />
        <label for="favorite">Favorites</label>
      </div>
      <div class="bm-actions">
        <button type="button" class="bm-btn" id="bm-cancel">Cancel</button>
        <button type="submit" class="bm-btn" id="bm-save">Save</button>
      </div>
    </form>
  </div>
  `;
}

function typeLabel(type) {
  switch (type) {
    case "image":
      return "Image";
    case "text":
      return "Text";
    default:
      return "Link";
  }
}

function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

