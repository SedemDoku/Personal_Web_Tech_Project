# Bookmark Manager - PHP/MySQL Version

A Raindrop.io-inspired bookmark manager with PHP backend and MySQL database, featuring a Chrome extension for quick bookmark saving.

## Features

- ✅ User authentication (signup/login with password validation)
- ✅ Bookmark management (create, read, update, delete)
- ✅ Collections/Categories with nested support
- ✅ Tags system
- ✅ Search functionality
- ✅ Multiple bookmark types (link, text, image, audio, video)
- ✅ Chrome extension for quick saving
- ✅ Beautiful, modern UI

## Setup Instructions

### 1. Database Setup

1. Open phpMyAdmin (or your MySQL client)
2. Create a new database or use the existing one
3. Import the `database.sql` file:
   - Click on "Import" tab in phpMyAdmin
   - Choose file: `database.sql`
   - Click "Go"

Alternatively, you can copy and paste the SQL from `database.sql` into the SQL tab and execute it.

### 2. PHP Configuration

**For School Server (Already Configured):**
- Database: `bookmark_db`
- Username: `sedem.doku`
- Password: `Nana Yaa`
- Host: `localhost`

The configuration is already set in `config.php`. If you need to change it, edit:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'bookmark_db');
define('DB_USER', 'sedem.doku');
define('DB_PASS', 'Nana Yaa');
```

**For Local Development:**
If running locally, update `config.php` with your local MySQL credentials.

Make sure PHP sessions are enabled (usually enabled by default)

### 3. Web Server Setup

#### Option A: Using XAMPP/WAMP/MAMP

1. Copy the entire project folder to your web server directory:
   - XAMPP: `C:\xampp\htdocs\bookmark_manager\`
   - WAMP: `C:\wamp64\www\bookmark_manager\`
   - MAMP: `/Applications/MAMP/htdocs/bookmark_manager/`

2. Start Apache and MySQL services

3. Access the application at: `http://localhost/bookmark_manager/`

#### Option B: Using PHP Built-in Server

1. Open terminal/command prompt in the project directory
2. Run: `php -S localhost:8000`
3. Access at: `http://localhost:8000`

### 4. Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `WebExtention` folder
5. The extension icon should appear in your toolbar

**School Server Configuration:**
- Server URL: `http://169.239.251.102:341/~sedem.doku/`
- API URL: `http://169.239.251.102:341/~sedem.doku/api`

The extension files are already configured with your school server URL. See `CONFIGURATION.md` for details.

### 5. First Use

1. Navigate to `login.html` or `signup.html`
2. Create a new account (password must be at least 8 characters with special characters)
3. After login, you'll be redirected to `index.php`
4. Start adding bookmarks!

## File Structure

```
bookmark_manager/
├── api/
│   ├── auth.php          # Authentication endpoints
│   ├── bookmarks.php     # Bookmark CRUD operations
│   └── collections.php   # Collection management
├── WebExtention/
│   ├── background.js    # Extension background script
│   ├── content.js       # Content script for modal
│   ├── popup.html/js    # Extension popup UI
│   └── manifest.json   # Extension manifest
├── config.php           # Database configuration
├── index.php            # Main application page
├── login.html           # Login page
├── signup.html          # Signup page
├── auth.js              # Authentication frontend logic
├── app.js               # Main application JavaScript
├── style.css            # Main stylesheet
├── auth.css             # Authentication page styles
└── database.sql         # Database schema

```

## API Endpoints

### Authentication (`api/auth.php`)

- `POST api/auth.php?action=signup` - Create new account
- `POST api/auth.php?action=login` - Login
- `POST api/auth.php?action=logout` - Logout
- `GET api/auth.php?action=check` - Check authentication status

### Bookmarks (`api/bookmarks.php`)

- `GET api/bookmarks.php` - List all bookmarks (supports `?collection_id=X&search=term&tag=name`)
- `POST api/bookmarks.php` - Create bookmark
- `PUT api/bookmarks.php?id=X` - Update bookmark
- `DELETE api/bookmarks.php?id=X` - Delete bookmark

### Collections (`api/collections.php`)

- `GET api/collections.php` - List all collections
- `POST api/collections.php` - Create collection
- `PUT api/collections.php?id=X` - Update collection
- `DELETE api/collections.php?id=X` - Delete collection

## Troubleshooting

### Database Connection Error

- Check `config.php` database credentials
- Ensure MySQL service is running
- Verify database `bookmark_manager` exists

### Extension Not Saving

- Check browser console for errors
- Verify API URL in `background.js` matches your server
- Ensure you're logged in (sessions are required)
- Check CORS settings if accessing from different domain

### Session Issues

- Clear browser cookies and try again
- Check PHP session configuration in `php.ini`
- Ensure `session_start()` is called in `config.php`

## Security Notes

- Change default database credentials in production
- Use HTTPS in production
- Consider adding CSRF protection
- Implement rate limiting for API endpoints
- Sanitize all user inputs (already done with prepared statements)

## Future Enhancements

- [ ] Image thumbnail generation
- [ ] Bookmark preview/metadata fetching
- [ ] Export/import functionality
- [ ] Sharing bookmarks between users
- [ ] Browser sync across devices
- [ ] Advanced search filters
- [ ] Bulk operations

## License

This project is for educational purposes.

