// Get all form elements
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const forgotPasswordForm = document.getElementById("forgot-password-form");
const authenticateForm = document.getElementById("authenticate-form");
const authenticate_register = document.getElementById("authenticate-register");

// Get all link elements
const registerLink = document.getElementById("register-link");
const loginLink = document.getElementById("login-link");
const forgotPasswordLink = document.getElementById("forgot-password-link");
const backToLoginLink = document.getElementById("back-to-login-link");

// Show register form
registerLink.addEventListener("click", function() {
  loginForm.classList.remove("active1");
  registerForm.classList.add("active1");
  forgotPasswordForm.classList.remove("active1");
  authenticateForm.classList.remove("active1");
});

// Show login form
loginLink.addEventListener("click", function() {
  loginForm.classList.add("active1");
  registerForm.classList.remove("active1");
  forgotPasswordForm.classList.remove("active1");
  authenticateForm.classList.remove("active1");
});

// Show forgot password form
forgotPasswordLink.addEventListener("click", function() {
  loginForm.classList.remove("active1");
  registerForm.classList.remove("active1");
  authenticateForm.classList.remove("active1");
  forgotPasswordForm.classList.add("active1");
});

// Back to login from forgot password
backToLoginLink.addEventListener("click", function() {
  loginForm.classList.add("active1");
  registerForm.classList.remove("active1");
  forgotPasswordForm.classList.remove("active1");
  authenticateForm.classList.remove("active1");
});
document.querySelectorAll(".toggle-password").forEach(icon => {
  let timeoutId = null;
  icon.addEventListener("click", function () {
    const targetId = this.getAttribute("data-target");
    const input = document.getElementById(targetId);
    console.log("login.js: Toggle password visibility for", targetId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      console.log("login.js: Cleared previous timeout for", targetId);
    }
    if (input.type === "password") {
      input.type = "text";
      this.classList.remove("bi-eye");
      this.classList.add("bi-eye-slash");
      this.setAttribute("aria-label", `Ẩn mật khẩu`);
      console.log("login.js: Password shown for", targetId);
      timeoutId = setTimeout(() => {
        input.type = "password";
        this.classList.remove("bi-eye-slash");
        this.classList.add("bi-eye");
        this.setAttribute("aria-label", `Hiển thị mật khẩu`);
        console.log("login.js: Password hidden automatically after 3 seconds for", targetId);
        timeoutId = null;
      }, 1500);
    } else {
      input.type = "password";
      this.classList.remove("bi-eye-slash");
      this.classList.add("bi-eye");
      this.setAttribute("aria-label", `Hiển thị mật khẩu`);
      console.log("login.js: Password hidden manually for", targetId);
      timeoutId = null;
    }
  });
});


document.addEventListener('DOMContentLoaded', function() { 
  const urlParams = new URLSearchParams(window.location.search);
  const showForm = urlParams.get('show');

  if (showForm === 'register') {
    document.getElementById('login-form').classList.remove('active1');
    document.getElementById('register-form').classList.add('active1');
    document.getElementById('forgot-password-form').classList.remove('active1');
    document.getElementById('authenticate-form').classList.remove('active1');
    document.getElementById('authenticate-register').classList.remove('active1');
  }
  if (showForm === 'forgot') {
    document.getElementById('login-form').classList.remove('active1');
    document.getElementById('register-form').classList.remove('active1');
    document.getElementById('forgot-password-form').classList.add('active1');
    document.getElementById('authenticate-form').classList.remove('active1');
    document.getElementById('authenticate-register').classList.remove('active1');
  }
  if(showForm === 'authen'){
    document.getElementById('login-form').classList.remove('active1');
    document.getElementById('register-form').classList.remove('active1');
    document.getElementById('forgot-password-form').classList.remove('active1');
    document.getElementById('authenticate-form').classList.add('active1');
    document.getElementById('authenticate-register').classList.remove('active1');
  }
  if(showForm === 'authen-register'){
    document.getElementById('login-form').classList.remove('active1');
    document.getElementById('register-form').classList.remove('active1');
    document.getElementById('forgot-password-form').classList.remove('active1');
    document.getElementById('authenticate-form').classList.remove('active1');
    document.getElementById('authenticate-register').classList.add('active1');
  }

  const alerts = document.querySelectorAll("#success-alert, #error-alert");

  alerts.forEach(function(alertBox) {
      setTimeout(function() {
          alertBox.style.opacity = "0";
          setTimeout(function() {
              alertBox.style.display = "none";
          }, 500); // Đợi hiệu ứng mờ xong mới ẩn
      }, 3000); // Hiển thị 3 giây
  });
});
