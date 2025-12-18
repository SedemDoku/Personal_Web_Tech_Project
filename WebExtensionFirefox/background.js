browser.runtime.onInstalled.addListener(() => {
  // 1. Highlighted Text
  browser.contextMenus.create({
    id: "save-highlight",
    title: "Save highlighted text",
    contexts: ["selection"]
  });

  // 2. Images
  browser.contextMenus.create({
    id: "save-image",
    title: "Save this image",
    contexts: ["image"]
  });

  // 3. YouTube Video
  browser.contextMenus.create({
    id: "save-youtube-video",
    title: "Save this YouTube video",
    contexts: ["page"],
    documentUrlPatterns: ["*://*.youtube.com/*", "*://*.youtu.be/*"]
  });

  // 3b. Generic Video
  browser.contextMenus.create({
    id: "save-video",
    title: "Save video link",
    contexts: ["video", "link"]
  });

  // 4. Page (Generic)
  browser.contextMenus.create({
    id: "save-page",
    title: "Save this page",
    contexts: ["page"]
  });
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  let type = "link";
  let content = tab.url; // Default to page URL

  // Determine what was clicked and extract the correct data
  if (info.menuItemId === "save-highlight") {
    type = "text";
    content = info.selectionText;
  } else if (info.menuItemId === "save-image") {
    type = "image";
    content = info.srcUrl; // The source URL of the image
  } else if (info.menuItemId === "save-youtube-video") {
    type = "video";
    content = tab.url; // YouTube video URL
  } else if (info.menuItemId === "save-video") {
    type = "video";
    content = info.srcUrl || info.linkUrl || tab.url; // Direct video or link URL
  }

  // Ask content script in the page to open the metadata modal
  browser.tabs.sendMessage(tab.id, {
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

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_BOOKMARK") {
    saveItem(message.payload)
      .then((result) => {
        console.log('saveItem result:', result);
        sendResponse({ ok: true, data: result });
      })
      .catch((error) => {
        console.error('saveItem error:', error);
        sendResponse({ ok: false, error: error.message });
      });
    return true; // keep channel open for async response
  }
});

async function saveItem(newItem) {
  // Get API URL and user info from storage
  const result = await browser.storage.local.get({ 
    apiUrl: 'http://169.239.251.102:341/~sedem.doku/Personal_Web_Tech_Project/api',
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
    title: (newItem.title && newItem.title.trim()) || fallbackTitle(newItem),
    url: newItem.url || "",
    type: newItem.type || "link",
    content: newItem.content || newItem.url || "",
    description: newItem.description || "",
    collection_id: newItem.collection_id || null,
    tags: newItem.tags || [],
    favorite: newItem.favorite || false
  };
  
  try {
    console.log('Saving bookmark with user_id:', userId, 'email:', userEmail);
    console.log('Bookmark data:', bookmarkData);
    
    const response = await fetch(`${apiUrl}/bookmarks.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId.toString(),
        'X-User-Email': userEmail
      },
      body: JSON.stringify(bookmarkData)
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (!data.success) {
      console.error('Failed to save bookmark:', data.error);
      throw new Error(data.error || 'Failed to save bookmark');
    }
    console.log('Bookmark saved successfully');
    return data;
  } catch (error) {
    console.error('Error saving bookmark:', error);
    throw error;
  }
}

async function fallbackSave(newItem) {
  return new Promise((resolve) => {
    browser.storage.local.get({ bookmarks: [] }, (result) => {
      const bookmarks = result.bookmarks;
      bookmarks.unshift({
        ...newItem,
        date: newItem.date || new Date().toLocaleString()
      });
      browser.storage.local.set({ bookmarks: bookmarks }, resolve);
    });
  });
}

function fallbackTitle(newItem) {
  const url = newItem.url || newItem.content || "";
  if (url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname || "Untitled";
    } catch (_err) {
      return url || "Untitled";
    }
  }
  return "Untitled";
}