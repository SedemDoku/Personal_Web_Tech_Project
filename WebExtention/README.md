# Chrome Extension Setup

## Configuration

Before using the extension, make sure to configure the API URL to match your server.

### Option 1: Update in Code
Edit `popup.js` and `background.js` and change the `API_BASE` or `apiUrl` default value to match your server URL.

Default: `http://169.239.251.102:341/~sedem.doku/api`

### Option 2: Set via Storage (Advanced)
The extension will check `chrome.storage.local` for `apiUrl`. You can set it programmatically or via the extension's options page (if you create one).

## Features

- ✅ Login/Logout functionality
- ✅ View all your bookmarks
- ✅ Delete bookmarks
- ✅ Save bookmarks via right-click context menu
- ✅ Works with PHP/MySQL backend

## Usage

1. **Login**: Click the extension icon and log in with your account credentials
2. **View Bookmarks**: After login, your bookmarks will be displayed in the popup
3. **Save Bookmarks**: Right-click on any page, text, image, or audio to save it
4. **Delete Bookmarks**: Click the "Delete" button on any bookmark in the popup

## Authentication

The extension uses header-based authentication:
- User ID and Email are sent with each API request
- Credentials are stored securely in `chrome.storage.local`
- Session is maintained until logout

## Troubleshooting

- **Can't connect to API**: Make sure your server is running and the API URL is correct
- **Login fails**: Verify your credentials and that the server is accessible
- **Bookmarks not loading**: Check browser console for errors and verify API URL

