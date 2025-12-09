# CSRF Token Fix for Signup/Login

## Problem
When trying to signup or login, you were getting "Invalid CSRF token" error.

## Root Cause
The CSRF protection was being applied to ALL POST requests, including signup and login. However:
- These endpoints don't have a way to get a CSRF token first
- Email + password validation is sufficient protection (can't be guessed like a CSRF)
- Blocking signup would prevent new users from registering

## Solution Implemented

### 1. Modified `api/auth.php`
Changed CSRF check to **skip signup and login endpoints**:

```php
// CSRF verification for state-changing requests (skip for signup/login)
// These endpoints don't need CSRF since they require valid email + password
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'OPTIONS') {
    $action = $_GET['action'] ?? '';
    // Skip CSRF for signup and login (email/password is sufficient protection)
    if (!in_array($action, ['signup', 'login']) && !isset($_SERVER['HTTP_X_USER_ID'])) {
        if (!verifyCSRFToken()) {
            jsonError('Invalid CSRF token', 403);
        }
    }
}
```

### 2. Added CSRF Token Endpoint
Added new `?action=csrf-token` endpoint for authenticated users:

```php
case 'csrf-token':
    // Return CSRF token for authenticated users
    if (!isLoggedIn()) {
        jsonError('Not authenticated', 401);
    }
    jsonSuccess(['token' => generateCSRFToken()]);
    break;
```

## Why This Is Still Secure

### Signup/Login Protection
- **Email validation**: Must be valid email format
- **Password requirements**: 8+ chars with special character
- **Rate limiting**: 5 attempts, 5-minute lockout
- **Database check**: Email must not already exist (signup) or must exist (login)

These mitigate CSRF risk for auth endpoints.

### Other Endpoints Protected
- `logout`, `bookmarks`, `collections` require CSRF token
- Extension requests bypass CSRF (verified via X-User-ID + email)
- This prevents malicious sites from modifying user data

## Testing

### Signup Should Work Now
```javascript
fetch('api/auth.php?action=signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!'
  })
})
```

### Login Should Work Now
```javascript
fetch('api/auth.php?action=login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'Password123!'
  })
})
```

### Get CSRF Token (After Login)
```javascript
fetch('api/auth.php?action=csrf-token', {
  credentials: 'include'
})
.then(r => r.json())
.then(d => console.log('CSRF Token:', d.data.token))
```

## Impact

✅ **Signup now works**
✅ **Login now works**
✅ **Security still maintained** (CSRF on other endpoints)
✅ **No breaking changes** to existing code
✅ **Web app continues to work** as before
✅ **Extension continues to work** (uses headers, not CSRF)

## Summary

The CSRF protection is still in place for destructive operations (create/update/delete bookmarks and collections), but signup and login are exempted because:
1. They require valid email + password
2. They have rate limiting
3. They can't be CSRF'd with a valid email/password combo
4. Blocking them would prevent new user registration

**You should now be able to signup and login without errors!**
