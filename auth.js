// Authentication with PHP backend
// Compute API base relative to current page so it works under subfolders (e.g. /~user/app)
const API_BASE = (() => {
  const parts = window.location.pathname.split('/');
  parts.pop(); // drop the current file name
  const base = parts.join('/') || '';
  return `${base}/api`;
})();
const USER_STORAGE_KEY = 'appUser';

function saveUserSession(user) {
  if (!user) return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function loadUserSession() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to parse stored user', err);
    return null;
  }
}

function clearUserSession() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

const alertBox = document.getElementById("alert");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const toggleButtons = document.querySelectorAll(".toggle-btn");
const cookieAcceptBtn = document.getElementById("cookie-accept-btn");
const cookieDeclineBtn = document.getElementById("cookie-decline-btn");

const specialCharRegex = /[!@#$%^&*()_\-+={[}\]|:;"'<>,.?/]/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper function to show error messages
function showError(message) {
  if (alertBox) {
    alertBox.textContent = message;
    alertBox.style.display = "block";
    alertBox.style.color = "red";
  }
}

// Helper function to show success messages
function showSuccess(message) {
  if (alertBox) {
    alertBox.textContent = message;
    alertBox.style.display = "block";
    alertBox.style.color = "green";
  }
}

// Check if already logged in and redirect
(async function checkAuth() {
  // Check if coming from logout - don't auto-redirect
  const urlParams = new URLSearchParams(window.location.search);
  const logoutAction = urlParams.get('action') === 'logout';
  const errorMsg = urlParams.get('error');
  
  if (logoutAction) {
    console.log('User just logged out, staying on login page');
    // Clear the URL parameter to prevent repeated checks
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }
  
  if (errorMsg === 'session_expired') {
    showError('Your session has expired. Please log in again.');
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  } else if (errorMsg === 'invalid_session') {
    showError('Invalid session. Please log in again.');
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }
  
  const storedUser = loadUserSession();
  if (!storedUser) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth.php?action=check`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'X-User-ID': storedUser.user_id,
        'X-User-Email': storedUser.email
      }
    });
    
    console.log('Auth check status:', response.status);
    
    if (response.status !== 200) {
      clearUserSession();
      return;
    }
    
    const data = await response.json();
    console.log('Auth check response:', data);
    
    if (data.success && data.authenticated) {
      console.log('User is logged in, redirecting to index.php');
      window.location.href = 'index.php';
    } else {
      clearUserSession();
      console.log('User is not logged in:', data);
    }
  } catch (error) {
    clearUserSession();
    console.log('Error checking auth:', error);
  }
})();

// Initialize cookie consent dialog
if (cookieAcceptBtn) {
  cookieAcceptBtn.addEventListener("click", () => {
    CookieManager.acceptCookies();
  });
}

if (cookieDeclineBtn) {
  cookieDeclineBtn.addEventListener("click", () => {
    CookieManager.declineCookies();
  });
}

// Show cookie consent dialog on page load if needed
window.addEventListener("load", () => {
  CookieManager.showConsentDialogIfNeeded();
});

toggleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-target");
    const input = document.getElementById(targetId);
    if (!input) return;
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    btn.textContent = isHidden ? "Hide" : "Show";
  });
});

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    
    const errors = validateEmail(email).concat(validatePassword(password));
    if (errors.length) {
      showError(errors.join("<br>"));
      return;
    }
    
    try {
      showSuccess("Logging in...");
      const response = await fetch(`${API_BASE}/auth.php?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        saveUserSession(data.data);
        showSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          window.location.href = 'index.php';
        }, 1000);
      } else {
        showError(data.error || "Login failed");
      }
    } catch (error) {
      showError("Network error. Please try again.");
      console.error(error);
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = signupForm.username.value.trim();
    const email = signupForm.email.value.trim();
    const password = signupForm.password.value;
    const confirmPassword = signupForm.confirm.value;

    const errors = [];
    if (!username) errors.push("Username is required.");
    errors.push(...validateEmail(email));
    errors.push(...validatePassword(password));
    errors.push(...validateMatch(password, confirmPassword));

    if (errors.length) {
      showError(errors.join("<br>"));
      return;
    }
    
    try {
      showSuccess("Creating account...");
      const response = await fetch(`${API_BASE}/auth.php?action=signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, email, password, confirmPassword })
      });
      
      const data = await response.json();
      
      if (data.success) {
        saveUserSession(data.data);
        showSuccess("Account created! Redirecting...");
        setTimeout(() => {
          window.location.href = 'index.php';
        }, 1000);
      } else {
        showError(data.error || "Signup failed");
      }
    } catch (error) {
      showError("Network error. Please try again.");
      console.error(error);
    }
  });
}

function validatePassword(password) {
  const errs = [];
  if (!password || password.length < 8) {
    errs.push("Password must be at least 8 characters.");
  }
  if (!specialCharRegex.test(password)) {
    errs.push("Password must include at least one special character.");
  }
  return errs;
}

function validateEmail(email) {
  if (!emailRegex.test(email)) {
    return ["Enter a valid email address."];
  }
  return [];
}

function validateMatch(password, confirm) {
  if (password !== confirm) {
    return ["Password and confirmation must match."];
  }
  return [];
}

