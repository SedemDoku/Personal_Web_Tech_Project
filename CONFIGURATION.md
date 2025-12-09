# Configuration Guide

## Database Configuration

The database configuration has been set up for your school server:

- **Database Name**: `bookmark_db`
- **Username**: `sedem.doku`
- **Password**: `Nana Yaa`
- **Host**: `localhost`

These settings are configured in `config.php`.

## API URL Configuration

### For Web Application

The web application (`auth.js` and `app.js`) uses relative paths by default:
- `api/auth.php`
- `api/bookmarks.php`
- `api/collections.php`

If your application is hosted at a specific path (e.g., `https://yourschool.edu/~sedem.doku/bookmark_manager/`), you may need to update the API paths.

### For Chrome Extension

The Chrome extension is configured for your school server:

1. **WebExtention/popup.js** (line 3):
   ```javascript
   const DEFAULT_API_BASE = 'http://169.239.251.102:341/~sedem.doku/api';
   ```

2. **WebExtention/background.js** (line 70):
   ```javascript
   apiUrl: 'http://169.239.251.102:341/~sedem.doku/api',
   ```

**School Server URL**: `http://169.239.251.102:341/~sedem.doku/`

## Setting Up on School Server

1. **Upload Files**: Upload all project files to your school server directory
2. **Import Database**: 
   - Open phpMyAdmin
   - Select `bookmark_db` database
   - Import `database.sql` (or run the SQL commands)
   - Note: The database should already exist, so you only need to create tables
3. **Update Extension URLs**: Update the API URLs in the extension files as shown above
4. **Test**: Visit your login page and test the application

## File Permissions

Make sure PHP files have proper permissions (usually 644) and directories are readable.

## Troubleshooting

- **Database Connection Error**: Verify credentials in `config.php` match your school server
- **Extension Can't Connect**: Check that the API URL in extension files matches your server URL
- **CORS Issues**: If accessing from different domain, you may need to add CORS headers in PHP files

