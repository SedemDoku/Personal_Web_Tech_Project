# Comprehensive System Documentation
## Personal Web Tech Project - Bookmark Manager


---

> Important: In the current state, server-side media uploads and downloads are disabled. Media is stored as external URLs (e.g., YouTube links, image URLs) and rendered by the client without passing through a media-serving API. The `/api/media.php` endpoint and local `uploads/media` storage are not used.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Authentication System](#authentication-system)
5. [API Endpoints](#api-endpoints)
6. Media Handling System (disabled)
7. [Frontend Application](#frontend-application)
8. [Browser Extension](#browser-extension)
9. [Security Features](#security-features)
10. [File Structure](#file-structure)
11. [Setup & Configuration](#setup--configuration)
12. [User Workflows](#user-workflows)
13. [Technical Details](#technical-details)
14. [Troubleshooting](#troubleshooting)

---

## System Overview

### Purpose
A comprehensive bookmark management system inspired by Raindrop.io, allowing users to save, organize, and manage various types of content including links, text snippets, images, audio, and video files. The system includes both a web application and a browser extension for seamless bookmarking across the web.

### Key Features
- **Multi-User Support**: Secure user authentication with isolated data
- **Multiple Content Types**: Links, text, images, audio, and video (via external URLs)
- **Media URLs & Embeds**: Save external media links (YouTube, images) without server-side downloads
- **Collections System**: Hierarchical organization with nested collections
- **Tagging System**: Flexible tagging for categorization
- **Search Functionality**: Full-text search across bookmarks
- **Browser Extension**: Quick save functionality via context menu
- **Responsive UI**: Modern, clean interface with grid/list views

### Technology Stack
- **Backend**: PHP 7.4+ with MySQL
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Database**: MySQL 5.7+ / MariaDB
- **Extension**: Chrome Extension Manifest V3
- **Storage**: MySQL for metadata; external URLs for media

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
├──────────────────────┬──────────────────────────────────────┤
│  Web Application     │      Browser Extension               │
│  (index.php)         │      (Chrome Extension)              │
│  - app.js            │      - popup.js                      │
│  - style.css         │      - background.js                 │
│  - auth.js           │      - content.js                    │
└──────────┬───────────┴──────────────┬───────────────────────┘
           │                           │
           │  HTTP/HTTPS Requests      │
           │  (JSON, FormData)         │
           │                           │
┌──────────▼───────────────────────────▼───────────────────────┐
│                    API Layer                                 │
├──────────────────────────────────────────────────────────────┤
│  api/auth.php        - Authentication endpoints              │
│  api/bookmarks.php   - Bookmark CRUD operations              │
│  api/collections.php - Collection management                 │
│  (media endpoint removed)                                    │
└──────────┬───────────────────────────────────────────────────┘
           │
           │  PDO Prepared Statements
           │
┌──────────▼───────────────────────────────────────────────────┐
│                  Database Layer                              │
├──────────────────────────────────────────────────────────────┤
│  MySQL Database (bookmark_db)                                │
│  - users                                                     │
│  - bookmarks                                                 │
│  - collections                                               │
│  - tags                                                      │
│  - bookmark_tags                                             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  File Storage Layer                          │
├──────────────────────────────────────────────────────────────┤
│  (File storage layer disabled in current state)              │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow

#### Web Application Flow
```
User Action → app.js → API Endpoint → Database → Response → UI Update
```

#### Extension Flow
```
Context Menu Click → background.js → content.js (Modal) → 
User Input → background.js → API Endpoint → Database → Success/Error
```

### Authentication Flow

```
1. User submits credentials (email/password)
2. Server validates and hashes password
3. Server returns user_id, email, username
4. Client stores in localStorage (web) or chrome.storage (extension)
5. Subsequent requests include X-User-ID and X-User-Email headers
6. Server validates headers against database
```

---

## Database Schema

### Tables Overview

#### 1. `users`
Stores user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| username | VARCHAR(50) | UNIQUE, NOT NULL | User's display name |
| email | VARCHAR(100) | UNIQUE, NOT NULL | User's email address |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update time |

**Indexes:**
- `idx_email` on `email`
- `idx_username` on `username`

#### 2. `collections`
Hierarchical organization structure for bookmarks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Collection identifier |
| user_id | INT | NOT NULL, FOREIGN KEY | Owner user ID |
| name | VARCHAR(100) | NOT NULL | Collection name |
| parent_id | INT | NULL, FOREIGN KEY | Parent collection (for nesting) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update time |

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE
- `parent_id` → `collections(id)` ON DELETE SET NULL

**Indexes:**
- `idx_user_id` on `user_id`
- `idx_parent_id` on `parent_id`

#### 3. `bookmarks`
Main table storing all bookmark data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Bookmark identifier |
| user_id | INT | NOT NULL, FOREIGN KEY | Owner user ID |
| collection_id | INT | NULL, FOREIGN KEY | Parent collection |
| title | VARCHAR(255) | NOT NULL | Bookmark title |
| url | TEXT | NULL | Original URL or page URL |
| type | ENUM | DEFAULT 'link' | Type: link, text, image, audio, video |
| content | TEXT | NULL | Content (text, image URL, or media path) |
| description | TEXT | NULL | Optional description |
| favorite | BOOLEAN | DEFAULT FALSE | Favorite flag |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update time |

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE
- `collection_id` → `collections(id)` ON DELETE SET NULL

**Indexes:**
- `idx_user_id` on `user_id`
- `idx_collection_id` on `collection_id`
- `idx_type` on `type`
- `idx_favorite` on `favorite`
- `FULLTEXT idx_search` on `(title, description, content)`

#### 4. `tags`
User-defined tags for categorization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | Tag identifier |
| user_id | INT | NOT NULL, FOREIGN KEY | Owner user ID |
| name | VARCHAR(50) | NOT NULL | Tag name |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |

**Constraints:**
- UNIQUE KEY `unique_user_tag` on `(user_id, name)`

**Foreign Keys:**
- `user_id` → `users(id)` ON DELETE CASCADE

**Indexes:**
- `idx_user_id` on `user_id`
- `idx_name` on `name`

#### 5. `bookmark_tags`
Junction table linking bookmarks to tags (many-to-many).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| bookmark_id | INT | PRIMARY KEY, FOREIGN KEY | Bookmark ID |
| tag_id | INT | PRIMARY KEY, FOREIGN KEY | Tag ID |

**Foreign Keys:**
- `bookmark_id` → `bookmarks(id)` ON DELETE CASCADE
- `tag_id` → `tags(id)` ON DELETE CASCADE

**Indexes:**
- `idx_bookmark_id` on `bookmark_id`
- `idx_tag_id` on `tag_id`

### Relationships

```
users (1) ────< (many) collections
users (1) ────< (many) bookmarks
users (1) ────< (many) tags
collections (1) ────< (many) bookmarks
bookmarks (many) ────< (many) tags (via bookmark_tags)
collections (1) ────< (many) collections (self-referential via parent_id)
```

---

## Authentication System

### Authentication Methods

The system uses **stateless authentication** via explicit HTTP headers, allowing both web applications and browser extensions to authenticate without server-side sessions.

#### Header-Based Authentication

**Headers Required:**
- `X-User-ID`: User's numeric ID
- `X-User-Email`: User's email address

**Validation Process:**
1. Extract headers from request
2. Query database: `SELECT id FROM users WHERE id = ? AND email = ?`
3. Return user ID if match found, null otherwise

**Implementation:**
```php
function authenticateUserFromHeaders() {
    $userId = $_SERVER['HTTP_X_USER_ID'] ?? null;
    $email = $_SERVER['HTTP_X_USER_EMAIL'] ?? null;
    
    if (!$userId || !$email) return null;
    
    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM users WHERE id = ? AND email = ? LIMIT 1");
    $stmt->execute([(int)$userId, $email]);
    $row = $stmt->fetch();
    return $row ? (int)$userId : null;
}
```

### Authentication Endpoints

#### POST `/api/auth.php?action=signup`

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

**Validation Rules:**
- Username: 3-50 characters
- Email: Valid email format
- Password: Minimum 8 characters, must contain special character
- Passwords must match

**Response (Success):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user_id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

**Process:**
1. Validate input
2. Check for existing username/email
3. Hash password with `password_hash()` (bcrypt)
4. Insert user into database
5. Create default "Unsorted" collection
6. Return user data

#### POST `/api/auth.php?action=login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Rate Limiting:**
- Maximum 5 login attempts per 5 minutes
- Stored in HTTP-only cookies
- Lockout after 5 failed attempts

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user_id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "token": "sha256_hash..."
  }
}
```

**Process:**
1. Check rate limiting
2. Query user by email
3. Verify password with `password_verify()`
4. Generate API token (optional, for future use)
5. Reset rate limit cookies on success
6. Return user data

#### POST `/api/auth.php?action=logout`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note:** Since authentication is stateless, logout is primarily a client-side operation (clearing stored credentials).

#### GET `/api/auth.php?action=check`

**Headers Required:**
- `X-User-ID`
- `X-User-Email`

**Response:**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user_id": 1,
    "message": "Header authentication valid"
  }
}
```

#### GET `/api/auth.php?action=user`

**Headers Required:**
- `X-User-ID`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

### Password Security

- **Hashing Algorithm**: Bcrypt (via PHP's `password_hash()`)
- **Cost Factor**: Default (10 rounds)
- **Storage**: Never store plaintext passwords
- **Verification**: Use `password_verify()` for all password checks

### Client-Side Storage

**Web Application:**
- Stores user data in `localStorage` under key `appUser`
- Contains: `user_id`, `email`, `username`

**Browser Extension:**
- Stores user data in `chrome.storage.local`
- Keys: `user_id`, `user_email`, `user_username`, `apiUrl`

---

## API Endpoints

### Bookmarks API (`/api/bookmarks.php`)

All endpoints require authentication headers: `X-User-ID` and `X-User-Email`.

#### GET `/api/bookmarks.php`

Retrieve bookmarks with optional filtering.

**Query Parameters:**
- `collection_id` (optional): Filter by collection ID
- `search` (optional): Full-text search term
- `tag` (optional): Filter by tag name
- `favorite` (optional): Filter favorites (`true`/`false`)

**Example:**
```
GET /api/bookmarks.php?collection_id=5&search=javascript&tag=programming
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "collection_id": 5,
      "title": "JavaScript Guide",
      "url": "https://example.com/js",
      "type": "link",
      "content": "https://example.com/js",
      "description": "Comprehensive JS guide",
      "favorite": false,
      "tags": ["programming", "javascript"],
      "collection_name": "Programming",
      "created_at": "2024-01-15 10:30:00"
    }
  ]
}
```

**SQL Query:**
```sql
SELECT b.*, 
       GROUP_CONCAT(DISTINCT t.name) as tags,
       c.name as collection_name
FROM bookmarks b
LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
LEFT JOIN tags t ON bt.tag_id = t.id
LEFT JOIN collections c ON b.collection_id = c.id
WHERE b.user_id = ?
  AND (collection_id filter)
  AND (search filter)
  AND (tag filter)
  AND (favorite filter)
GROUP BY b.id
ORDER BY b.created_at DESC
```

#### POST `/api/bookmarks.php`

Create a new bookmark.

**Request (JSON):**
```json
{
  "title": "My Bookmark",
  "url": "https://example.com",
  "type": "link",
  "content": "https://example.com",
  "description": "Optional description",
  "collection_id": 5,
  "tags": ["tag1", "tag2"],
  "favorite": false
}
```

**Note on Media:**
In the current state, media is provided as external URLs (e.g., YouTube links, direct image links). No server-side file uploads are available. Specify the external URL in the `content` field.

**Response:**
```json
{
  "success": true,
  "message": "Bookmark created successfully",
  "data": {
    "id": 1,
    "title": "My Bookmark",
    ...
  }
}
```

**Process:**
1. Validate required fields (title)
2. Validate type (link, text, image, audio, video)
3. Handle media URL download if applicable
4. Insert bookmark
5. Create/link tags
6. Return complete bookmark data

#### PUT `/api/bookmarks.php?id={id}`

Update an existing bookmark.

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "favorite": true,
  "tags": ["new", "tags"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bookmark updated successfully"
}
```

**Process:**
1. Verify bookmark ownership
2. Update provided fields
3. Update tags if provided
4. Return success

#### DELETE `/api/bookmarks.php?id={id}`

Delete a bookmark.

**Response:**
```json
{
  "success": true,
  "message": "Bookmark deleted successfully"
}
```

### Collections API (`/api/collections.php`)

#### GET `/api/collections.php`

Retrieve all collections in tree structure.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "name": "Programming",
      "parent_id": null,
      "bookmark_count": 15,
      "children": [
        {
          "id": 2,
          "name": "JavaScript",
          "parent_id": 1,
          "bookmark_count": 8,
          "children": []
        }
      ]
    }
  ]
}
```

#### POST `/api/collections.php`

Create a new collection.

**Request:**
```json
{
  "name": "New Collection",
  "parent_id": 1
}
```

#### PUT `/api/collections.php?id={id}`

Update collection.

**Request:**
```json
{
  "name": "Updated Name",
  "parent_id": 2
}
```

#### DELETE `/api/collections.php?id={id}`

Delete collection (cascades to bookmarks via foreign key).

### Media API (removed)

The dedicated media-serving endpoint is not available in this state. Media is referenced by external URLs (e.g., YouTube, direct image links) and rendered client-side. Do not attempt to upload or serve files from the server.

**Query Parameters:**
- `f`: Filename (e.g., `1_1234567890_abc123.mp3`)
- `user_id`: User ID (for HTML media elements that can't send headers)
- `user_email`: User email (for HTML media elements)

**Security Checks:**
1. Extract user ID from filename (format: `{userId}_{timestamp}_{hash}.{ext}`)
2. Authenticate user via headers or URL parameters
3. Verify user owns the file (user ID matches)
4. Verify file exists in database
5. Verify MIME type is allowed
6. Serve file with proper headers

**Response Headers:**
```
Content-Type: audio/mpeg
Content-Disposition: inline; filename="1_1234567890_abc123.mp3"
Cache-Control: public, max-age=31536000
Content-Length: 1234567
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

**CORS Headers:**
- `Access-Control-Allow-Origin`: Based on origin whitelist
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: GET, OPTIONS`

---

## Media Handling System (Disabled)

### Overview

Server-side media downloads/uploads are disabled. The application stores media as external URLs and renders via standard browser capabilities (e.g., YouTube embeds, direct image links). No local `uploads/media` storage is used in this state.

### Supported Media Types

**Audio:**
- Formats: MP3, WAV, WebM, M4A, FLAC
- MIME Types: `audio/mpeg`, `audio/wav`, `audio/webm`, `audio/m4a`, `audio/flac`

**Video:**
- Formats: MP4, WebM, QuickTime (MOV), AVI
- MIME Types: `video/mp4`, `video/webm`, `video/quicktime`, `video/x-msvideo`

**Note:** Images are NOT automatically downloaded (user reverted this feature).

### File Naming Convention

**Format:** `{userId}_{timestamp}_{hash}.{ext}`

**Example:** `12_1701234567_a1b2c3d4.mp3`

**Components:**
- `userId`: Owner's user ID (for access control)
- `timestamp`: Unix timestamp when file was created
- `hash`: 8-character MD5 hash (for uniqueness)
- `ext`: File extension

### Download Process

#### Automatic URL Download

**DISABLED** - Not available in this state.

#### File Upload

**DISABLED** - Server-side file uploads are not available. Provide media via external URLs (e.g., YouTube, direct image links).

### Validation Rules

**Note:** File validation is not applicable in the current state. Media is provided as external URLs.

### Storage Location

**Directory:** `uploads/media/` (not used in current state)

**Permissions:**
- Read: Web server user
- Write: Web server user
- Recommended: 755 (directory), 644 (files)

**Security:**
- Server file storage and serving are disabled in this state.
- Media should be referenced by external URLs (e.g., YouTube, images).

### Media Serving

In this state there is no server media endpoint. Clients render media from external URLs (e.g., YouTube embeds or direct image links).
3. Verify file exists in user's bookmarks
4. Verify MIME type is allowed
5. Serve file with proper headers

**CORS:**
- Supports cross-origin requests
- Whitelist-based origin checking
- Chrome extension origins allowed

---

## Frontend Application

### Main Application (`index.php`)

**Entry Point:** `index.php` (redirects from `index.html`)

**Structure:**
- Header with search and user menu
- Sidebar with collections
- Main content area with bookmark grid
- Modals for adding bookmarks/collections

### JavaScript Architecture (`app.js`)

#### State Management

```javascript
const state = {
  bookmarks: [],      // Current bookmarks array
  collections: [],     // Collections tree
  search: "",         // Current search term
  collectionId: null, // Active collection filter
  collectionName: "All", // Active collection name
  tag: null          // Active tag filter
};
```

#### Key Functions

**Initialization:**
- `init()`: Loads user, collections, bookmarks, wires events, renders

**Data Loading:**
- `loadUser()`: Fetches current user info
- `loadCollections()`: Fetches collections tree
- `loadBookmarks()`: Fetches bookmarks with filters

**Rendering:**
- `render()`: Main render function for bookmark grid
- `renderCollections()`: Renders collections sidebar
- `renderMediaPreview()`: Renders media previews (audio/video)
- `renderTags()`: Renders tag chips
- `renderTagFilter()`: Renders tag filter bar

**Bookmark Management:**
- `createBookmark()`: Creates new bookmark via API
- `deleteBookmark()`: Deletes bookmark
- `openBookmarkModal()`: Opens add/edit modal
- `closeBookmarkModal()`: Closes modal

**Collection Management:**
- `createCollection()`: Creates new collection
- `openCollectionModal()`: Opens collection modal
- `closeCollectionModal()`: Closes modal

#### Media Preview Rendering

**Audio:**
```javascript
const filename = item.content.includes('/') 
  ? item.content.split('/').pop() 
  : item.content;
// In URL-only mode, use the original external URL directly
return `<audio controls src="${item.content}"></audio>`;
```

**Video:**
```javascript
const filename = item.content.includes('/') 
  ? item.content.split('/').pop() 
  : item.content;
// In URL-only mode, use the original external URL directly or embed YouTube
return `<video controls src="${item.content}"></video>`;
```

**Image:**
```javascript
return `<img src="${item.content}" alt="${item.title}">`;
```

### Authentication (`auth.js`)

**Functions:**
- `handleSignup()`: Handles user registration
- `handleLogin()`: Handles user login
- `handleLogout()`: Clears user data and redirects

**Storage:**
- Uses `localStorage` with key `appUser`
- Stores: `user_id`, `email`, `username`

### Styling

**Files:**
- `style.css`: Main application styles
- `auth.css`: Authentication page styles
- `cookies.css`: Cookie consent dialog styles

**Features:**
- Responsive grid layout
- List/Grid view toggle
- Modern card-based design
- Smooth animations
- Dark/light theme support (via CSS variables)

---

## Browser Extension

### Manifest (`manifest.json`)

**Version:** Manifest V3

**Permissions:**
- `contextMenus`: Right-click menu items
- `storage`: Local storage for user data
- `activeTab`: Access to current tab
- `scripting`: Inject content scripts
- `tabs`: Tab information

**Host Permissions:**
- `http://localhost/*`
- `http://127.0.0.1/*`
- `https://*/*`
- `http://*/*`

### Background Script (`background.js`)

**Service Worker** (Manifest V3)

#### Context Menu Setup

Creates right-click menu items:
1. **Save highlighted text**: For selected text
2. **Save this image**: For images
3. **Save this audio**: For audio elements
4. **Save this page**: For entire page

#### Message Handlers

**`SAVE_BOOKMARK` Message:**
- Receives bookmark data from content script
- Calls `saveItem()` function
- Returns success/error response

#### Functions

**`saveItem(newItem)`:**
1. Retrieves API URL and user credentials from storage
2. Checks if user is logged in
3. Sends POST request to `/api/bookmarks.php`
4. Falls back to local storage if API fails
5. Returns result

**`fallbackSave(newItem)`:**
- Saves bookmark to `chrome.storage.local`
- Used when API is unavailable or user not logged in

### Content Script (`content.js`)

**Purpose:** Injects modal into web pages for bookmark metadata input.

#### Message Listeners

**`OPEN_MODAL` Message:**
- Receives bookmark data from background script
- Displays modal with pre-filled data
- Allows user to edit title, description, tags, collection

#### Modal Features

- Title input (pre-filled from page title)
- Description textarea
- URL display (read-only)
- Type selector (link, text, image, audio, video)
- Content display/edit
- Collection selector
- Tags input (comma-separated)
- Favorite checkbox
- Save/Cancel buttons

#### Functions

**`onSubmit(e)`:**
- Collects form data
- Sends `SAVE_BOOKMARK` message to background script
- Closes modal on success

**`closeModal()`:**
- Removes modal from DOM

**`modalTemplate(data)`:**
- Generates HTML for modal
- Pre-fills with provided data

### Popup (`popup.html` / `popup.js`)

**Purpose:** Extension popup for viewing saved bookmarks and login.

#### Views

**Login View:**
- Email input
- Password input (with show/hide toggle)
- Login button
- Signup link (opens in new tab)

**Bookmarks View:**
- User info display
- Logout button
- Bookmark list
- Empty state message

#### Functions

**`init()`:**
- Loads API URL from storage
- Checks if user is logged in
- Shows appropriate view

**`handleLogin(e)`:**
- Sends login request to API
- Stores user data in `chrome.storage.local`
- Switches to bookmarks view

**`handleLogout()`:**
- Clears user data from storage
- Switches to login view

**`loadBookmarks()`:**
- Fetches bookmarks from API
- Renders bookmark list
- Handles authentication errors

**`deleteBookmark(id)`:**
- Sends DELETE request to API
- Reloads bookmark list

**`renderContent(item)`:**
- Renders bookmark content based on type
- Returns icon and HTML

### Extension Workflow

```
1. User right-clicks on page/image/text
2. Background script creates context menu
3. User selects menu item
4. Background script sends message to content script
5. Content script injects modal
6. User fills metadata and saves
7. Content script sends SAVE_BOOKMARK message
8. Background script saves to API
9. Success/error feedback shown
```

### Storage

**Keys Used:**
- `user_id`: User's ID
- `user_email`: User's email
- `user_username`: User's username
- `apiUrl`: API base URL
- `bookmarks`: Fallback local storage (array)

---

## Security Features

### Authentication Security

1. **Password Hashing:**
   - Bcrypt with cost factor 10
   - Never stored in plaintext
   - `password_verify()` for all checks

2. **Rate Limiting:**
   - 5 login attempts per 5 minutes
   - Stored in HTTP-only cookies
   - Automatic lockout

3. **Stateless Authentication:**
   - No server-side sessions
   - Header-based validation
   - Database verification on each request

### Input Validation

1. **SQL Injection Prevention:**
   - All queries use PDO prepared statements
   - Parameter binding for all user input
   - No string concatenation in SQL

2. **XSS Prevention:**
   - `escapeHTML()` function for all output
   - Content Security Policy headers
   - Input sanitization

### Access Control

1. **User Isolation:**
   - All queries filtered by `user_id`
   - Foreign key constraints ensure data integrity
   - Ownership verification on all operations

2. **CORS Protection:**
   - Origin whitelist
   - Credentials required
   - Preflight request handling

### Security Headers

**Set in `config.php`:**
```php
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
```

**Set in `api/media.php`:**
```php
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
```

### File System Security

1. **Upload Directory:**
  - Not used in current state (URL-only media)
  - No server file access
  - File permission guidance not applicable

2. **Filename Security:**
   - User ID prefix prevents access to other users' files
   - Timestamp and hash prevent collisions
   - Sanitized extensions only

---

## File Structure

```
Personal_Web_Tech_Project/
├── api/                          # API Endpoints
│   ├── auth.php                  # Authentication API
│   ├── bookmarks.php            # Bookmarks CRUD API
│   └── collections.php           # Collections API
│
├── WebExtention/                 # Chrome Extension
│   ├── manifest.json             # Extension manifest
│   ├── background.js             # Service worker
│   ├── content.js                # Content script
│   ├── popup.html                # Extension popup
│   ├── popup.js                  # Popup logic
│   └── bookmark-ribbon-icon.png  # Extension icon
│
├── config.php                    # Configuration & utilities
├── index.php                     # Main application page
├── index.html                    # Redirect to index.php
├── login.html                    # Login page
├── signup.html                   # Signup page
│
├── app.js                        # Main application JavaScript
├── auth.js                       # Authentication JavaScript
├── cookies.js                    # Cookie consent management
│
├── style.css                     # Main stylesheet
├── auth.css                      # Authentication styles
├── cookies.css                   # Cookie consent styles
│
├── database.sql                  # Database schema
├── setup_database.php            # Database setup script
│
├── README.md                     # Basic documentation
├── CONFIGURATION.md              # Configuration guide
├── QUICK_START.md                # Quick start guide
├── COMPREHENSIVE_DOCUMENTATION.md # This file
└── SECURITY.md                   # Security documentation
```

---

## Setup & Configuration

### Prerequisites

- PHP 7.4 or higher
- MySQL 5.7+ or MariaDB
- Apache/Nginx web server (or PHP built-in server)
- Chrome browser (for extension)

### Database Setup

1. **Create Database:**
```sql
CREATE DATABASE bookmark_db;
```

2. **Import Schema:**
```bash
mysql -u root -p bookmark_db < database.sql
```

Or use phpMyAdmin to import `database.sql`.

3. **Configure Database Connection:**
Edit `config.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'bookmark_db');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
```

### Web Server Setup

#### Option 1: XAMPP/WAMP/MAMP

1. Copy project to web root:
   - XAMPP: `C:\xampp\htdocs\Personal_Web_Tech_Project\`
   - WAMP: `C:\wamp64\www\Personal_Web_Tech_Project\`
   - MAMP: `/Applications/MAMP/htdocs/Personal_Web_Tech_Project/`

2. Start Apache and MySQL

3. Access: `http://localhost/Personal_Web_Tech_Project/`

#### Option 2: PHP Built-in Server

```bash
cd Personal_Web_Tech_Project
php -S localhost:8000
```

Access: `http://localhost:8000`

### Extension Setup

1. **Open Chrome Extensions:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)

2. **Load Extension:**
   - Click "Load unpacked"
   - Select `WebExtention` folder

3. **Configure API URL (if needed):**
   - Open extension popup
   - Login will store API URL automatically
   - Or edit `background.js` and `popup.js` to change default

### Configuration Files

#### `config.php`

**Key Constants:**
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'bookmark_db');
define('DB_USER', 'root');
define('DB_PASS', '');

define('ALLOWED_ORIGINS', ['http://localhost', 'http://127.0.0.1']);
// Media file configuration is not used (URL-only media mode)
```

#### Extension Configuration

**`background.js` and `popup.js`:**
```javascript
const DEFAULT_API_BASE = 'http://localhost/Personal_Web_Tech_Project/api';
```

Change to your server URL if different.

---

## User Workflows

### Web Application Workflow

#### 1. User Registration

```
1. Navigate to signup.html
2. Fill in username, email, password
3. Submit form
4. Server validates and creates account
5. Default "Unsorted" collection created
6. Redirect to login.html
```

#### 2. User Login

```
1. Navigate to login.html
2. Enter email and password
3. Submit form
4. Server validates credentials
5. User data stored in localStorage
6. Redirect to index.php
```

#### 3. Creating a Bookmark

**Via Web Interface:**
```
1. Click "Add Bookmark" button
2. Fill in modal form:
   - Title (required)
   - URL (optional)
   - Type (link, text, image, audio, video)
   - Content/Description
   - Collection (optional)
   - Tags (comma-separated)
   - Favorite (checkbox)
3. Submit form
4. If audio/video with URL, file is downloaded automatically
5. Bookmark appears in grid
```

**Via Extension:**
```
1. Right-click on page/image/text/audio
2. Select context menu option
3. Modal appears with pre-filled data
4. Edit metadata if needed
5. Click "Save"
6. Bookmark saved to server
```

#### 4. Organizing Bookmarks

**Collections:**
```
1. Click "New collection" in sidebar
2. Enter collection name
3. Optionally select parent collection
4. Collection appears in sidebar
5. Drag bookmarks to collection or select when creating
```

**Tags:**
```
1. Add tags when creating/editing bookmark
2. Tags appear as chips on bookmark cards
3. Click tag chip to filter by tag
4. Tag filter appears in header
```

#### 5. Searching

```
1. Type in search box
2. Results filter in real-time
3. Search includes title, description, and content
4. Can combine with collection/tag filters
```

#### 6. Media Playback

**Audio/Video:**
```
1. Bookmark displays appropriate preview (image, YouTube embed, etc.)
2. Media rendered directly from external URL
3. Browser native controls
```

### Extension Workflow

#### 1. First-Time Setup

```
1. Install extension
2. Click extension icon
3. Login with credentials
4. Extension stores user data
5. Ready to save bookmarks
```

#### 2. Saving a Bookmark

**From Context Menu:**
```
1. Right-click on page element
2. Select "Save highlighted text" / "Save this image" / etc.
3. Modal appears on page
4. Edit metadata (or paste external media URL)
5. Click "Save"
6. Bookmark saved to server
7. Success message shown
```

**From Popup:**
```
1. Click extension icon
2. View saved bookmarks
3. Can delete bookmarks from popup
4. Can open bookmarks in new tab
```

#### 3. Offline Mode

```
1. If API unavailable or not logged in
2. Bookmarks saved to chrome.storage.local
3. Can view in popup
4. Syncs when API available (manual process)
```

---

## Technical Details

### Media Handling (URL-Only)

Media is handled entirely on the client side using external URLs. No server-side download or file storage is performed.

### Authentication Flow

```
Client Request
    ↓
Extract X-User-ID and X-User-Email headers
    ↓
Query: SELECT id FROM users WHERE id = ? AND email = ?
    ↓
If match found → Return user_id
If no match → Return null (401 Unauthorized)
```

### CORS Implementation

```php
function setCORSHeaders() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, ALLOWED_ORIGINS) || 
        strpos($origin, 'chrome-extension://') === 0) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-User-ID, X-User-Email, X-CSRF-Token');
}
```

### Error Handling

**API Error Response Format:**
```json
{
  "error": "Error message here"
}
```

**Success Response Format:**
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (validation error)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (access denied)
- `404`: Not Found
- `405`: Method Not Allowed
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Symptoms:**
- "Database connection failed" error
- API returns 500 error

**Solutions:**
- Check `config.php` database credentials
- Verify MySQL service is running
- Ensure database `bookmark_db` exists
- Check user permissions

#### 2. Media Files Not Playing

**Symptoms:**
- Audio/video players show error
- "OpaqueResponseBlocking" error in console

**Solutions:**
- Check CORS headers are set
- Verify user authentication headers/parameters
- Check browser console for specific errors

#### 3. Extension Not Saving

**Symptoms:**
- Context menu doesn't appear
- Modal doesn't show
- "Failed to save bookmark" error

**Solutions:**
- Check extension is enabled
- Verify user is logged in (check popup)
- Check API URL in `background.js`
- Check browser console for errors
- Verify CORS settings allow extension origin

#### 4. Authentication Issues

**Symptoms:**
- "Authentication required" errors
- User gets logged out frequently

**Solutions:**
- Check headers are being sent (`X-User-ID`, `X-User-Email`)
- Verify user exists in database
- Check localStorage/chrome.storage has user data
- Clear storage and re-login

#### 5. Search Not Working

**Symptoms:**
- Search returns no results
- Search doesn't filter

**Solutions:**
- Verify FULLTEXT index exists on bookmarks table
- Check search query format
- Verify user_id filter is applied
- Check database charset (should be utf8mb4)

### Debugging Tips

1. **Enable Error Logging:**
```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

2. **Check Browser Console:**
- Open DevTools (F12)
- Check Console tab for JavaScript errors
- Check Network tab for API request/response

3. **Check PHP Error Log:**
- Location: Usually in `php.ini` or server logs
- Look for PHP errors, warnings, notices

4. **Database Debugging:**
- Use phpMyAdmin to inspect data
- Check foreign key constraints
- Verify indexes exist

5. **Extension Debugging:**
- Open `chrome://extensions/`
- Click "Inspect views: service worker" for background.js
- Use popup DevTools for popup.js
- Check content script in page DevTools

### Performance Optimization

1. **Database Indexes:**
   - Already implemented on key columns
   - Monitor slow query log

2. **File Storage:**
   - Consider CDN for media files
   - Implement file cleanup cron job
   - Monitor disk usage

3. **Caching:**
   - Media files have long cache headers
   - Consider browser caching for API responses
   - Implement ETags for conditional requests

4. **Pagination:**
   - Consider pagination for large bookmark lists
   - Implement lazy loading for media

---

## Conclusion

This documentation provides a comprehensive overview of the Personal Web Tech Project bookmark management system. The system is designed with security, scalability, and user experience in mind, supporting multiple content types via external URLs, hierarchical organization, and seamless browser integration.

**Important:** This version of the system operates in URL-only media mode. Server-side media uploads, downloads, and file serving are disabled. All media is referenced and rendered using external URLs (e.g., YouTube, direct image links).

For additional support or questions, refer to the individual component documentation files or check the code comments for implementation details.

---

**Document Version:** 1.0 (Updated for URL-only Media Mode)  
**Last Updated:** December 18, 2025  
**Maintained By:** Development Team

