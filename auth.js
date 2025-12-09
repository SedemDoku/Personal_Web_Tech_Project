// Authentication with PHP backend
const API_BASE = '/Personal_Web_Tech_Project/api';

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
  
  try {
    const response = await fetch(`${API_BASE}/auth.php?action=check`, {
      method: 'GET',
      credentials: 'include'
    });
    
    // If status is not 200, user is not authenticated
    if (response.status !== 200) {
      console.log('User is not logged in (status:', response.status + ')');
      return;
    }
    
    const data = await response.json();
    if (data.success) {
      // Already logged in, redirect to main page
      console.log('User is logged in, redirecting to index.php');
      window.location.href = 'index.php';
    } else {
      console.log('User is not logged in');
    }
  } catch (error) {
    // Not logged in, stay on login page
    console.log('Error checking auth:', error);
  }
})();

const alertBox = document.getElementById("alert");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const toggleButtons = document.querySelectorAll(".toggle-btn");

const specialCharRegex = /[!@#$%^&*()_\-+={[}\]|:;"'<>,.?/]/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function showError(msg) {
  if (!alertBox) return;
  alertBox.className = "error";
  alertBox.innerHTML = msg;
}

function showSuccess(msg) {
  if (!alertBox) return;
  alertBox.className = "success";
  alertBox.innerHTML = msg;
}

