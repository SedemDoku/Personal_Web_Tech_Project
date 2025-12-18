# Bookmark Manager - Full Stack Web Application

A modern, dark-themed bookmark manager with visual canvas organization. Built with PHP, MySQL, GoJS, and vanilla JavaScript. Features a sleek homepage, user authentication, and browser extensions for Chrome and Firefox.

## 🚀 Features

### Core Functionality
- ✅ **Modern Homepage** - Raycast-inspired dark theme landing page with animated backgrounds
- ✅ **User Authentication** - Secure signup/login with dark-themed UI and session management
- ✅ **Visual Canvas Mode** - GoJS-powered interactive canvas for spatial bookmark organization
- ✅ **Bookmark Management** - Full CRUD operations with media preview support
- ✅ **Collections/Categories** - Nested collection support with hierarchical organization
- ✅ **Tags System** - Tag-based bookmark organization
- ✅ **Search & Filter** - Advanced search functionality across bookmarks
- ✅ **Media Previews** - View images, videos (YouTube), and text content inline
- ✅ **Multiple Bookmark Types** - Link, text, image, audio, and video bookmarks

### Canvas Features
- ✅ **Drag & Drop** - Freely position bookmarks anywhere on an infinite canvas
- ✅ **Visual Connections** - Draw arrows between related bookmarks
- ✅ **Auto-Save** - Canvas layout automatically persists to database
- ✅ **Media Icons** - Visual indicators (🎥🖼️📝🎵) for different bookmark types
- ✅ **Click to Preview** - Open media modals directly from canvas nodes

### Browser Extensions
- ✅ **Chrome Extension** - Quick bookmark saving via context menu
- ✅ **Firefox Extension** - Full Firefox support with WebExtensions API
- ✅ **Extension Features** - Login, view bookmarks, delete, and save from any webpage

### Design & UX
- ✅ **Dark Theme** - Consistent dark color scheme across all pages (#0a0a0a background)
- ✅ **Animated UI** - Floating shapes, gradient text, smooth transitions
- ✅ **Responsive Design** - Works seamlessly on desktop and mobile
- ✅ **Logo Branding** - Custom logo.png integrated throughout

### Security Features
- ✅ **CORS Protection** - Whitelist-based origin control
- ✅ **CSRF Protection** - Token-based request validation
- ✅ **SQL Injection Prevention** - Prepared statements throughout
- ✅ **Security Headers** - CSP, X-Frame-Options, XSS protection
- ✅ **Input Validation** - Comprehensive sanitization and validation
- ✅ **User Isolation** - Strict database-level user data separation


## 📋 Prerequisites

- PHP 7.4 or higher
- MySQL 5.7 or higher / MariaDB 10.2+
- Apache or PHP built-in server
- Chrome or Firefox browser (for extensions)

## 🛠️ Setup Instructions

### 1. Database Setup

1. Open phpMyAdmin or your MySQL client
2. Create a new database named `bookmark_db`
3. Import the database schema:
   ```bash
   mysql -u your_username -p bookmark_db < database.sql
   ```
   Or use phpMyAdmin's Import feature with `database.sql`

### 2. PHP Configuration

Edit `config.php` with your database credentials:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'bookmark_db');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
```

**Environment Variables (Optional):**
The application supports environment variables for enhanced security:
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`

### 3. Web Server Setup

#### Option A: XAMPP/WAMP/MAMP

1. Copy project to web server directory:
   - XAMPP: `C:\xampp\htdocs\Personal_Web_Tech_Project\`
   - WAMP: `C:\wamp64\www\Personal_Web_Tech_Project\`
   - MAMP: `/Applications/MAMP/htdocs/Personal_Web_Tech_Project/`

2. Start Apache and MySQL services

3. Access at: `http://localhost/Personal_Web_Tech_Project/` (redirects to home.html)

#### Option B: PHP Built-in Server

```bash
cd c:\xampp\htdocs\Personal_Web_Tech_Project
php -S localhost:8000
```

Access at: `http://localhost:8000` (redirects to home.html)

### 4. Browser Extension Setup

#### Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `WebExtention/` folder
5. Configure API URL in `popup.js` if needed

#### Firefox Extension

1. Open Firefox → `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from `WebExtensionFirefox/` folder
4. Configure API URL in `popup.js` if needed

<!-- Media uploads and server-side downloads are disabled in the current state. -->

### 6. First Use

1. Navigate to the homepage at `http://localhost/Personal_Web_Tech_Project/` or `home.html`
2. Click "Sign Up" to create an account (password requirements: 8+ chars, must include special character)
3. Log in with your credentials
4. Click "Go to Dashboard" to start managing bookmarks
5. Use the grid view for traditional bookmark browsing
6. Click the canvas button (in collection view) for visual organization mode
7. Drag bookmarks around the canvas and draw connections between them!

## 📁 Project Structure

```
Personal_Web_Tech_Project/
├── api/
│   ├── auth.php           # Authentication endpoints (signup, login, logout)
│   ├── bookmarks.php      # Bookmark CRUD
│   ├── collections.php    # Collection management
│   └── canvas.php         # Canvas positions and connections
├── WebExtention/          # Chrome extension
│   ├── background.js      # Background service worker
│   ├── content.js         # Content script
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Popup logic
│   ├── manifest.json      # Chrome extension manifest
│   └── README.md          # Extension documentation
├── WebExtensionFirefox/   # Firefox extension
│   ├── background.js      # Firefox background script
│   ├── content.js         # Content script
│   ├── popup.html         # Extension popup UI
│   ├── popup.js           # Popup logic
│   └── manifest.json      # Firefox extension manifest
├── home.html              # Landing page (dark theme, animated)
├── index.html             # Redirects to home.html
├── index.php              # Main dashboard (requires login)
├── login.html             # Login page (dark theme)
├── signup.html            # Signup page (dark theme)
├── app.js                 # Main application JavaScript
├── auth.js                # Authentication JavaScript
├── canvas.js              # GoJS canvas logic
├── cookies.js             # Cookie consent handling
├── style.css              # Main application styles (dark theme)
├── auth.css               # Authentication page styles (dark theme)
├── cookies.css            # Cookie banner styles
├── logo.png               # Application logo
├── config.php             # Database config + security functions
├── database.sql           # Database schema (includes canvas tables)
├── setup_database.php     # Database setup helper
├── README.md              # This file
├── QUICK_START.md         # Implementation reference
├── CONFIGURATION.md       # Configuration guide
└── COMPREHENSIVE_DOCUMENTATION.md  # Detailed documentation
```

## 🔌 API Endpoints

### Authentication (`api/auth.php`)

- `POST /api/auth.php?action=signup` - Create new user account
- `POST /api/auth.php?action=login` - User login
- `POST /api/auth.php?action=logout` - User logout
- `GET /api/auth.php?action=check` - Check authentication status
- `GET /api/auth.php?action=user` - Get current user info

### Bookmarks (`api/bookmarks.php`)

- `GET /api/bookmarks.php` - Get all bookmarks for authenticated user
- `GET /api/bookmarks.php?id={id}` - Get specific bookmark
- `POST /api/bookmarks.php` - Create new bookmark (JSON only; media URLs only)
- `PUT /api/bookmarks.php?id={id}` - Update bookmark
- `DELETE /api/bookmarks.php?id={id}` - Delete bookmark

### Collections (`api/collections.php`)

- `GET /api/collections.php` - Get all collections for authenticated user
- `GET /api/collections.php?id={id}` - Get specific collection
- `POST /api/collections.php` - Create new collection
- `PUT /api/collections.php?id={id}` - Update collection
- `DELETE /api/collections.php?id={id}` - Delete collection

### Canvas (`api/canvas.php`)

- `GET /api/canvas.php?collectionId={id}` - Get canvas positions and connections for a collection
- `POST /api/canvas.php` - Save canvas layout (positions and connections)



## 🔐 Security Features

### Request Protection
- **CORS**: Whitelist-based origin validation
- **CSRF**: Token-based protection for state-changing operations
- **SQL Injection**: All queries use prepared statements
- **Input Validation**: Comprehensive sanitization of all user inputs

### Headers
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

### Authentication
- Session-based authentication for web app
- Header-based authentication for browser extensions
- Password hashing with PHP's `password_hash()`
- Password requirements: 8+ characters, must include special character

### User Isolation
- Database-level user_id enforcement
- No cross-user data access possible

## 🎯 Usage

### Web Application

1. **Homepage**: Start at the modern dark-themed landing page (`home.html`)
2. **Sign Up**: Create an account with username, email, and password
3. **Login**: Access your dashboard
4. **Dashboard**: View bookmarks in grid or list mode
5. **Create Bookmarks**: Click "Add Bookmark" button to save links, text, images, or videos
6. **Collections**: Organize bookmarks into nested folders
7. **Canvas Mode**: Switch to visual canvas view within any collection
   - Drag bookmarks to position them freely
   - Draw connections between related bookmarks
   - Click bookmark nodes to preview content
   - Layout auto-saves as you work
8. **Search**: Use the search bar to filter bookmarks
9. **Tags**: Add tags for additional organization
10. **Logout**: Safely logout and return to homepage

### Canvas Features

- **Access**: Click canvas button when viewing a collection
- **Drag & Drop**: Click and drag bookmark nodes to reposition
- **Connections**: Use the link tool to draw arrows between bookmarks
- **Media Icons**: Visual indicators show bookmark type (🎥 video, 🖼️ image, 📝 text, 🎵 audio, 🔗 link)
- **Quick Preview**: Click any node to open media preview modal
- **Zoom & Pan**: Use toolbar controls or mouse wheel
- **Auto-Save**: Canvas layout persists automatically

### Browser Extension

1. **Login**: Click extension icon and enter credentials
2. **View Bookmarks**: Browse all bookmarks in the popup
3. **Quick Save**: Right-click on any page element → "Save to Bookmarks"
4. **Context Menu Options**:
   - Save page as bookmark
   - Save selected text
   - Save image
   - Save audio/video
5. **Delete**: Click delete button on any bookmark in popup

## 🎨 UI Features

- **Dark Theme**: Consistent #0a0a0a background across all pages
- **Animated Homepage**: Floating shapes, gradient text, smooth transitions
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Custom Logo**: logo.png integrated throughout the interface
- **Modern Cards**: Elevated surfaces with hover effects
- **Canvas Visualization**: GoJS-powered infinite canvas
- **Media Previews**: Inline viewing of images, videos, and text
- **Real-time Search**: Instant filtering as you type
- **Modal Dialogs**: Clean forms for bookmarks and collections
- **Cookie Consent**: GDPR-compliant cookie banner
- **Loading States**: Visual feedback during operations

## 📚 Documentation

- **README.md** (this file) - Setup and overview
- **QUICK_START.md** - Quick implementation reference and requirements checklist
- **CONFIGURATION.md** - Detailed configuration guide
- **COMPREHENSIVE_DOCUMENTATION.md** - Complete technical documentation
- **WebExtention/README.md** - Browser extension setup guide

## 🛠️ Development

### Database Schema

The application uses 6 main tables:
- `users` - User accounts
- `collections` - Bookmark collections/folders
- `bookmarks` - Bookmark entries
- `tags` - Bookmark tags
- `bookmark_canvas_positions` - Canvas node positions
- `bookmark_canvas_connections` - Canvas node connections

See [database.sql](database.sql) for complete schema.

### Technology Stack

**Backend:**
- PHP 7.4+
- MySQL 5.7+
- RESTful API with JSON responses

**Frontend:**
- Vanilla JavaScript (ES6+)
- GoJS 3.0.2 for canvas visualization
- CSS3 with custom properties (dark theme)
- PreviewBox for link previews
- No major frameworks required

**Browser Extensions:**
- WebExtensions API
- Chrome Manifest V3
- Firefox WebExtensions

## 🐛 Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check credentials in `config.php`
- Ensure database `bookmark_db` exists

### Extension Not Working
- Check API URL in `popup.js` and `background.js`
- Verify server is accessible
- Check browser console for errors
- Ensure CORS headers are set correctly



### Login/Session Issues
- Clear browser cookies
- Check PHP session configuration
- Verify `session_start()` is called

## 📝 License

This is a personal web technology project for educational purposes.

## 👤 Author

Created as part of a web technology course project.

---

**Note**: For detailed implementation notes and security requirements, see [QUICK_START.md](QUICK_START.md)