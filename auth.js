// auth.js

function getUsers() {
  return JSON.parse(localStorage.getItem("users") || "[]");
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function setSession(email) {
  localStorage.setItem("loggedInUser", email);
}

function getSession() {
  return localStorage.getItem("loggedInUser");
}

function logout() {
  localStorage.removeItem("loggedInUser");
  window.location.href = "login.html";
}

// Protect pages like index.html & menu.html
function requireAuth() {
  if (!getSession()) window.location.href = "login.html";
}
