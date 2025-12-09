# Security Measures

This document outlines all security measures implemented in the Bookmark Manager application.

## Authentication & Authorization

### 1. Session Management
- **Session Security**: Sessions use secure cookie settings (HttpOnly, SameSite)
- **Session Regeneration**: Session IDs are regenerated every 30 minutes to prevent session fixation attacks
- **Session Timeout**: Sessions expire after 2 hours of inactivity
- **Session Validation**: User existence is verified on each request to prevent access with deleted accounts

### 2. Page Protection
- **index.php**: Requires authentication, redirects to login if not logged in
- **index.html**: Automatically redirects to index.php (prevents direct access)
- **Login/Signup Pages**: Check if user is already logged in and redirect to main page

### 3. API Endpoint Protection
All API endpoints (`bookmarks.php`, `collections.php`) require authentication:
- **Web App**: Uses PHP sessions
- **Extension**: Uses header-based authentication (X-User-ID, X-User-Email)
- **Validation**: User ID and email are verified against database
- **Error Handling**: Returns 401 Unauthorized for invalid/missing credentials

## Security Features

### 1. Login Security
- **Rate Limiting**: Maximum 5 login attempts, 5-minute lockout after failures
- **Password Verification**: Uses PHP's `password_verify()` with bcrypt hashing
- **Session Regeneration**: New session ID generated on successful login

### 2. Input Validation
- **SQL Injection Prevention**: All database queries use prepared statements
- **XSS Prevention**: User input is escaped when displayed
- **Email Validation**: Email format is validated using PHP's filter_var()
- **Password Requirements**: Minimum 8 characters with special characters

### 3. Session Security
- **HttpOnly Cookies**: Prevents JavaScript access to session cookies
- **SameSite Cookies**: Prevents CSRF attacks
- **Session Activity Tracking**: Last activity timestamp updated on each request
- **Automatic Cleanup**: Expired sessions are automatically destroyed

### 4. Error Handling
- **Generic Error Messages**: Doesn't reveal if email exists in database
- **Secure Logout**: Completely destroys session and cookies
- **Session Expiry Messages**: Users are informed when sessions expire

## Access Control

### Protected Pages
- `index.php` - Main bookmark page (requires login)
- `api/bookmarks.php` - Bookmark API (requires authentication)
- `api/collections.php` - Collections API (requires authentication)

### Public Pages
- `login.html` - Login page (redirects if already logged in)
- `signup.html` - Signup page
- `api/auth.php` - Authentication endpoints (public but rate-limited)

## Security Best Practices

1. **Never expose sensitive data** in error messages
2. **Always use prepared statements** for database queries
3. **Validate and sanitize** all user input
4. **Use HTTPS in production** (update `session.cookie_secure` in config.php)
5. **Regular session cleanup** prevents session hijacking
6. **Rate limiting** prevents brute force attacks

## Configuration

Security settings can be adjusted in `config.php`:
- `SESSION_LIFETIME`: Session duration (default: 7 days)
- `SESSION_TIMEOUT`: Inactivity timeout (default: 2 hours)
- Cookie security settings in session configuration

## Extension Security

The Chrome extension uses header-based authentication:
- User credentials stored securely in `chrome.storage.local`
- Headers sent with each API request: `X-User-ID`, `X-User-Email`
- Server validates credentials against database on each request

## Recommendations for Production

1. **Enable HTTPS**: Update `session.cookie_secure` to 1 in config.php
2. **Add CSRF Tokens**: Implement CSRF protection for form submissions
3. **Implement CAPTCHA**: Add CAPTCHA to login/signup forms
4. **Log Security Events**: Log failed login attempts and suspicious activity
5. **Regular Updates**: Keep PHP and dependencies updated
6. **Database Backups**: Regular backups of user data
7. **Password Reset**: Implement secure password reset functionality

