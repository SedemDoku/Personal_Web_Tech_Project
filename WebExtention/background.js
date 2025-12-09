chrome.runtime.onInstalled.addListener(() => {
  // 1. Highlighted Text
  chrome.contextMenus.create({
    id: "save-highlight",
    title: "Save highlighted text",
    contexts: ["selection"]
  });

  // 2. Images
  chrome.contextMenus.create({
    id: "save-image",
    title: "Save this image",
    contexts: ["image"]
  });

  // 3. Audio
  chrome.contextMenus.create({
    id: "save-audio",
    title: "Save this audio",
    contexts: ["audio"]
  });

  // 4. Page (Generic)
  chrome.contextMenus.create({
    id: "save-page",
    title: "Save this page",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let type = "page";
  let content = tab.url; // Default to page URL

  // Determine what was clicked and extract the correct data
  if (info.menuItemId === "save-highlight") {
    type = "text";
    content = info.selectionText;
  } else if (info.menuItemId === "save-image") {
    type = "image";
    content = info.srcUrl; // The source URL of the image
  } else if (info.menuItemId === "save-audio") {
    type = "audio";
    content = info.srcUrl; // The source URL of the audio file
  }

  // Ask content script in the page to open the metadata modal
  chrome.tabs.sendMessage(tab.id, {
    type: "OPEN_MODAL",
    payload: {
      type,
      content,
      url: tab.url,
      title: tab.title || "Unknown Page"
    }
  }).catch((error) => {
    console.error('Error sending message to content script:', error);
    // Silently fail - content script might not be available on this page
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_BOOKMARK") {
    saveItem(message.payload).then(() => sendResponse({ ok: true }));
    return true; // keep channel open
  }
});

async function saveItem(newItem) {
  // Get API URL and user info from storage
  const result = await chrome.storage.local.get({ 
    apiUrl: 'http://localhost/Personal_Web_Tech_Project/api',
    user_id: null,
    user_email: null
  });
  
  const apiUrl = result.apiUrl;
  const userId = result.user_id;
  const userEmail = result.user_email;
  
  // If not logged in, fallback to local storage
  if (!userId || !userEmail) {
    console.log('User not logged in, saving to local storage');
    return fallbackSave(newItem);
  }
  
  const bookmarkData = {
    title: newItem.title || "Untitled",
    url: newItem.url || "",
    type: newItem.type || "link",
    content: newItem.content || newItem.url || "",
    description: newItem.description || "",
    collection_id: newItem.collection_id || null,
    tags: newItem.tags || [],
    favorite: newItem.favorite || false
  };
  
  try {
    const response = await fetch(`${apiUrl}/bookmarks.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId.toString(),
        'X-User-Email': userEmail
      },
      body: JSON.stringify(bookmarkData)
    });
    
    const data = await response.json();
    if (!data.success) {
      console.error('Failed to save bookmark:', data.error);
      // Fallback to local storage if API fails
      return fallbackSave(newItem);
    }
    return data;
  } catch (error) {
    console.error('Error saving bookmark:', error);
    // Fallback to local storage
    return fallbackSave(newItem);
  }
}

async function fallbackSave(newItem) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ bookmarks: [] }, (result) => {
      const bookmarks = result.bookmarks;
      bookmarks.unshift({
        ...newItem,
        date: newItem.date || new Date().toLocaleString()
      });
      chrome.storage.local.set({ bookmarks: bookmarks }, resolve);
    });
  });
}