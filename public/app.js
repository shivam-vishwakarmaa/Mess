const state = {
  token: localStorage.getItem("token") || "",
  user: null,
  theme: localStorage.getItem("theme") || "dark"
};
let suggestionTimer = null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const el = {
  authSection: document.getElementById("authSection"),
  appSection: document.getElementById("appSection"),
  loginTab: document.getElementById("loginTab"),
  registerTab: document.getElementById("registerTab"),
  loginForm: document.getElementById("loginForm"),
  forgotForm: document.getElementById("forgotForm"),
  forgotToggleBtn: document.getElementById("forgotToggleBtn"),
  forgotEmail: document.getElementById("forgotEmail"),
  forgotMessage: document.getElementById("forgotMessage"),
  loginRole: document.getElementById("loginRole"),
  registerForm: document.getElementById("registerForm"),
  registerRole: document.getElementById("registerRole"),
  adminCodeWrap: document.getElementById("adminCodeWrap"),
  adminCode: document.getElementById("adminCode"),
  messageBox: document.getElementById("messageBox"),
  welcomeText: document.getElementById("welcomeText"),
  metaText: document.getElementById("metaText"),
  logoutBtn: document.getElementById("logoutBtn"),
  studentPanel: document.getElementById("studentPanel"),
  adminPanel: document.getElementById("adminPanel"),
  refreshMeBtn: document.getElementById("refreshMeBtn"),
  requestMsg: document.getElementById("requestMsg"),
  sendRequestBtn: document.getElementById("sendRequestBtn"),
  myRequestList: document.getElementById("myRequestList"),
  searchName: document.getElementById("searchName"),
  searchBtn: document.getElementById("searchBtn"),
  searchSuggestions: document.getElementById("searchSuggestions"),
  searchUsers: document.getElementById("searchUsers"),
  loadPendingBtn: document.getElementById("loadPendingBtn"),
  loadResetRequestsBtn: document.getElementById("loadResetRequestsBtn"),
  resetRequests: document.getElementById("resetRequests"),
  globalStats: document.getElementById("globalStats"),
  expiringList: document.getElementById("expiringList"),
  themeToggle: document.getElementById("themeToggle"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  registerPhone: document.getElementById("registerPhone"),
  adminContactDisplay: document.getElementById("adminContactDisplay"),
  adminMyPhone: document.getElementById("adminMyPhone"),
  updateAdminPhoneBtn: document.getElementById("updateAdminPhoneBtn"),
  requestDate: document.getElementById("requestDate"),
  pendingRequests: document.getElementById("pendingRequests")
};

function showMessage(text, isError = false) {
  el.messageBox.textContent = text;
  el.messageBox.classList.remove("error", "success");
  el.messageBox.classList.add(isError ? "error" : "success");
  el.messageBox.classList.add("show");
  setTimeout(() => el.messageBox.classList.remove("show"), 2500);
}

function clearNode(node) {
  if (!node) return;
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function makeItem() {
  const item = document.createElement("div");
  item.className = "item";
  return item;
}

function appendTextLine(parent, text) {
  const line = document.createElement("div");
  line.textContent = text;
  parent.appendChild(line);
}

function validEmail(email) {
  return EMAIL_REGEX.test(email);
}

function validPassword(password) {
  return password.length >= 8;
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function setAuthUI(loggedIn) {
  el.authSection.classList.toggle("hidden", loggedIn);
  el.appSection.classList.toggle("hidden", !loggedIn);
}

function setTab(tab) {
  const login = tab === "login";
  el.loginForm.classList.toggle("hidden", !login);
  el.forgotForm.classList.add("hidden");
  el.registerForm.classList.toggle("hidden", login);
  el.loginTab.classList.toggle("active", login);
  el.registerTab.classList.toggle("active", !login);
}

function toggleAdminCodeField() {
  const isAdminRegistration = el.registerRole.value === "admin";
  el.adminCodeWrap.classList.toggle("hidden", !isAdminRegistration);
  el.adminCode.required = isAdminRegistration;
}

function togglePasswordVisibility(button) {
  const wrap = button.closest(".password-wrap");
  const input = wrap ? wrap.querySelector('input') : null;
  if (!input) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  button.textContent = show ? "Hide" : "Show";
}

function logout() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("token");
  setAuthUI(false);
  showMessage("Logged out");
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString();
}

function applyTheme() {
  const isLight = state.theme === "light";
  document.body.classList.toggle("light-mode", isLight);
  el.themeToggle.textContent = isLight ? "🌙" : "🌞";
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", state.theme);
  applyTheme();
}

function setLoading(btn, isLoading, originalText) {
  if (isLoading) {
    btn.classList.add("loading");
    btn.disabled = true;
    btn.textContent = "Processing...";
  } else {
    btn.classList.remove("loading");
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function drawUserHeader() {
  el.welcomeText.textContent = `Welcome, ${state.user.name} (${state.user.role})`;
  if (state.user.role === "admin") {
    el.metaText.textContent = `Joining date: ${formatDate(state.user.joiningDate)}`;
  } else {
    el.metaText.textContent = `Joining date: ${formatDate(
      state.user.joiningDate
    )} | Days left for 30-day cycle: ${state.user.daysLeftFor30}`;
  }
}

async function refreshMe() {
  const data = await api("/api/auth/me");
  state.user = data.user;
  state.stats = data.stats || {};
  drawUserHeader();
  setAuthUI(true);
  const isAdmin = state.user.role === "admin";
  el.studentPanel.classList.toggle("hidden", isAdmin);
  el.adminPanel.classList.toggle("hidden", !isAdmin);

  // Show admin contact for students
  if (!isAdmin && data.adminContact) {
    el.adminContactDisplay.textContent = `Contact to admin via this number: ${data.adminContact}`;
    el.adminContactDisplay.classList.remove("hidden");
  } else {
    el.adminContactDisplay.classList.add("hidden");
  }

  // Set admin's own phone in the input
  if (isAdmin && state.user.phoneNumber) {
    el.adminMyPhone.value = state.user.phoneNumber;
  }

  // Set default date for leave requests
  if (!isAdmin && el.requestDate && !el.requestDate.value) {
    el.requestDate.value = new Date().toISOString().split('T')[0];
  }

  // Render global stats for admins only (Privacy fix)
  if (isAdmin && data.stats) {
    renderGlobalStats(data.stats);
  } else {
    el.globalStats.classList.add("hidden");
  }
}

function renderGlobalStats(stats) {
  const container = el.globalStats;
  clearNode(container);
  container.classList.remove("hidden");

  const totalCard = document.createElement("div");
  totalCard.className = "stat-card";
  totalCard.innerHTML = `<span class="stat-val">${stats.totalStudents}</span><span class="stat-label">Total Students</span>`;

  const eatCard = document.createElement("div");
  eatCard.className = "stat-card";
  eatCard.innerHTML = `<span class="stat-val">${stats.todayEaters}</span><span class="stat-label">Eating Today</span>`;

  container.appendChild(totalCard);
  container.appendChild(eatCard);
}

async function loadAdminDashboard() {
  try {
    const data = await api("/api/admin/metrics");
    clearNode(el.expiringList);

    if (data.expiringStudents.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "✅ No students expiring soon!";
      el.expiringList.appendChild(empty);
    } else {
      data.expiringStudents.forEach((user) => {
        const item = makeItem();
        item.classList.add("expiring-item");
        appendTextLine(item, `${user.name}${user.username ? " (@" + user.username + ")" : ""}`);

        const daysLine = document.createElement("div");
        daysLine.className = user.daysLeft === 0 ? "days-expired" : "days-warning";
        daysLine.textContent = user.daysLeft === 0 ? "⚠ EXPIRED" : `⚠ ${user.daysLeft} day(s) left`;
        item.appendChild(daysLine);

        const actionRow = document.createElement("div");
        actionRow.className = "row wrap";

        const renewBtn = document.createElement("button");
        renewBtn.className = "renew-btn";
        renewBtn.textContent = "🔄 Renew Cycle (+30 days)";
        renewBtn.addEventListener("click", () => adminRenewUser(user.id, user.name, item));

        actionRow.appendChild(renewBtn);
        item.appendChild(actionRow);
        el.expiringList.appendChild(item);
      });
    }
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function adminRenewUser(userId, userName, itemEl) {
  if (!window.confirm(`Renew 30-day cycle for "${userName}"? (They must have paid fees)`)) return;
  try {
    await api(`/api/admin/users/${userId}/renew`, { method: "PUT" });
    showMessage(`✅ Cycle renewed for ${userName}!`);
    // Animate removal
    itemEl.style.transition = "opacity 0.4s";
    itemEl.style.opacity = "0";
    setTimeout(() => itemEl.remove(), 400);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function loadStudentData() {
  const [requestsRes] = await Promise.all([
    api("/api/requests/me")
  ]);

  clearNode(el.myRequestList);
  requestsRes.requests.forEach((request) => {
    const item = makeItem();
    appendTextLine(item, `${request.dateKey} | ${request.status}`);
    appendTextLine(item, request.message);
    el.myRequestList.appendChild(item);
  });
}

async function onLogin(e) {
  e.preventDefault();
  const btn = el.loginForm.querySelector('button[type="submit"]');
  const orgText = btn.textContent;

  try {
    setLoading(btn, true, orgText);
    const role = el.loginRole.value;
    const identifier = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!identifier) {
      return showMessage("Username or Email is required", true);
    }
    if (!password) {
      return showMessage("Password is required", true);
    }

    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password, role })
    });
    state.token = data.token;
    localStorage.setItem("token", state.token);
    await refreshMe();
    if (state.user.role === "student") await loadStudentData();
    if (state.user.role === "admin") {
      await loadAdminDashboard();
      await loadPending();
    }
    showMessage("Login successful");
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setLoading(btn, false, orgText);
  }
}

async function onRegister(e) {
  e.preventDefault();
  const btn = el.registerForm.querySelector('button[type="submit"]');
  const orgText = btn.textContent;

  try {
    setLoading(btn, true, orgText);
    const role = el.registerRole.value;
    const name = document.getElementById("registerName").value.trim();
    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const phoneNumber = el.registerPhone.value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const adminCode = el.adminCode.value.trim();

    if (!name || name.length < 2) {
      return showMessage("Name must be at least 2 characters", true);
    }
    if (!username || username.length < 3) {
      return showMessage("Username must be at least 3 characters", true);
    }
    if (!validEmail(email)) {
      return showMessage("Please enter a valid email address", true);
    }
    if (!validPassword(password)) {
      return showMessage("Password must be at least 8 characters", true);
    }
    if (role === "admin" && !adminCode) {
      return showMessage("Admin secret code is required", true);
    }

    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, username, email, password, phoneNumber, role, adminCode })
    });
    state.token = data.token;
    localStorage.setItem("token", state.token);
    await refreshMe();
    if (state.user.role === "student") await loadStudentData();
    if (state.user.role === "admin") {
      await loadAdminDashboard();
      await loadPending();
    }
    showMessage("Account created");
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setLoading(btn, false, orgText);
  }
}



async function initSession() {
  if (!state.token) {
    setAuthUI(false);
    return;
  }

  try {
    await refreshMe();
    if (state.user.role === "student") await loadStudentData();
    if (state.user.role === "admin") {
      await loadAdminDashboard();
      await loadPending();
      await loadPasswordResets();
    }
  } catch (_error) {
    logout();
  }
}

async function searchAttendance() {
  const name = el.searchName.value.trim();
  if (!name) return showMessage("Enter student name", true);
  clearNode(el.searchSuggestions);

  try {
    const data = await api(`/api/admin/attendance/search?name=${encodeURIComponent(name)}`);

    clearNode(el.searchUsers);
    data.users.forEach((user) => {
      const item = makeItem();
      item.style.cursor = "pointer";

      const nameLine = document.createElement("div");
      nameLine.style.fontWeight = "bold";
      nameLine.style.fontSize = "1.1rem";
      nameLine.textContent = `${user.name} (@${user.username || "no-username"})`;
      item.appendChild(nameLine);

      appendTextLine(item, `Email: ${user.email} | Phone: ${user.phoneNumber || "N/A"}`);
      appendTextLine(
        item,
        `Joined: ${formatDate(user.joiningDate)} | Days left: ${user.daysLeftFor30} | Renewals: ${user.renewals || 0}`
      );

      const editForm = document.createElement("div");
      editForm.className = "form hidden";
      editForm.style.marginTop = "15px";
      editForm.style.padding = "15px";
      editForm.style.background = "rgba(255,255,255,0.05)";
      editForm.style.borderRadius = "8px";

      const uId = user.id || user._id;
      editForm.innerHTML = `
        <div class="row wrap" style="gap: 10px;">
          <input type="text" value="${user.name}" placeholder="Full Name" id="editName_${uId}" />
          <input type="text" value="${user.username || ""}" placeholder="Username" id="editUsername_${uId}" />
          <input type="email" value="${user.email}" placeholder="Email" id="editEmail_${uId}" />
          <input type="tel" value="${user.phoneNumber || ""}" placeholder="Phone" id="editPhone_${user.id || user._id}" />
          <input type="number" value="${user.renewals || 0}" placeholder="Renewals" id="editRenewals_${user.id || user._id}" title="Renewals" />
          <input type="password" placeholder="New Password (optional)" id="editPassword_${user.id || user._id}" />
        </div>
        <div class="row wrap" style="margin-top: 10px; gap: 10px;">
          <button class="save-btn" style="background: #2a5a3a;">Save Changes</button>
          <button class="danger delete-btn">Delete User</button>
        </div>
      `;

      item.addEventListener("click", (e) => {
        // Prevent toggling if clicking inside the form inputs/buttons
        if (editForm.contains(e.target)) return;
        editForm.classList.toggle("hidden");
      });

      editForm.querySelector(".save-btn").addEventListener("click", async () => {
        const uId = user.id || user._id;
        const payload = {
          name: document.getElementById(`editName_${uId}`).value.trim(),
          username: document.getElementById(`editUsername_${uId}`).value.trim(),
          email: document.getElementById(`editEmail_${uId}`).value.trim(),
          phoneNumber: document.getElementById(`editPhone_${uId}`).value.trim(),
          renewals: parseInt(document.getElementById(`editRenewals_${uId}`).value),
          password: document.getElementById(`editPassword_${uId}`).value.trim()
        };
        await adminUpdateUser(uId, payload);
      });

      editForm.querySelector(".delete-btn").addEventListener("click", async () => {
        await adminDeleteUser(user.id, user.name);
      });

      item.appendChild(editForm);
      el.searchUsers.appendChild(item);
    });
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function adminUpdateUser(userId, payload) {
  try {
    const data = await api(`/api/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    showMessage(data.message || "User updated");
    await searchAttendance();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function updateAdminPhone() {
  const phoneNumber = el.adminMyPhone.value.trim();
  try {
    await api(`/api/admin/users/${state.user.id}`, {
      method: "PUT",
      body: JSON.stringify({ phoneNumber })
    });
    state.user.phoneNumber = phoneNumber;
    showMessage("Phone number updated");
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function adminChangePassword(userId, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    return showMessage("Password must be at least 8 characters", true);
  }
  try {
    const data = await api(`/api/admin/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ newPassword })
    });
    showMessage(data.message || "Password changed");
  } catch (error) {
    showMessage(error.message, true);
  }
}



async function adminDeleteUser(userId, userName) {
  const ok = window.confirm(`Delete user "${userName}" and all their attendance data?`);
  if (!ok) return;

  try {
    await api(`/api/admin/users/${userId}`, { method: "DELETE" });
    showMessage("User deleted");
    await searchAttendance();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function loadUserSuggestions(query) {
  const q = query.trim();
  if (!q) {
    clearNode(el.searchSuggestions);
    return;
  }

  try {
    const data = await api(`/api/admin/users/suggest?q=${encodeURIComponent(q)}`);
    clearNode(el.searchSuggestions);

    data.users.forEach((user) => {
      const item = makeItem();
      appendTextLine(item, `${user.name} (${user.email})`);
      item.addEventListener("click", () => {
        el.searchName.value = user.name;
        clearNode(el.searchSuggestions);
        searchAttendance();
      });
      el.searchSuggestions.appendChild(item);
    });
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function loadPending() {
  try {
    const data = await api("/api/admin/requests?status=pending");
    clearNode(el.pendingRequests);
    data.requests.forEach((request) => {
      const item = makeItem();
      appendTextLine(item, `${request.user?.name || "Unknown"} | ${request.dateKey}`);
      appendTextLine(item, request.message);

      const actionRow = document.createElement("div");
      actionRow.className = "row wrap";

      const approveBtn = document.createElement("button");
      approveBtn.className = "approve";
      approveBtn.textContent = "Yes";
      approveBtn.addEventListener("click", () => reviewRequest(request._id, "approve"));

      const rejectBtn = document.createElement("button");
      rejectBtn.className = "danger";
      rejectBtn.textContent = "No";
      rejectBtn.addEventListener("click", () => reviewRequest(request._id, "reject"));

      actionRow.appendChild(approveBtn);
      actionRow.appendChild(rejectBtn);
      item.appendChild(actionRow);
      el.pendingRequests.appendChild(item);
    });
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function loadPasswordResets() {
  try {
    const data = await api("/api/admin/password-resets");
    clearNode(el.resetRequests);
    data.requests.forEach((request) => {
      const item = makeItem();
      appendTextLine(
        item,
        `${request.user?.name || "Unknown"} (${request.email})`
      );
      appendTextLine(item, request.message || "No message");

      const actionRow = document.createElement("div");
      actionRow.className = "row wrap";

      const passwordInput = document.createElement("input");
      passwordInput.type = "text";
      passwordInput.placeholder = "New password (for approve)";

      const approveBtn = document.createElement("button");
      approveBtn.className = "approve";
      approveBtn.textContent = "Approve + Reset";
      approveBtn.addEventListener("click", async () => {
        await reviewPasswordReset(request._id, "approve", passwordInput.value);
      });

      const rejectBtn = document.createElement("button");
      rejectBtn.className = "danger";
      rejectBtn.textContent = "Reject";
      rejectBtn.addEventListener("click", async () => {
        await reviewPasswordReset(request._id, "reject", "");
      });

      actionRow.appendChild(passwordInput);
      actionRow.appendChild(approveBtn);
      actionRow.appendChild(rejectBtn);
      item.appendChild(actionRow);
      el.resetRequests.appendChild(item);
    });
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function reviewPasswordReset(requestId, action, newPassword) {
  try {
    if (action === "approve" && !newPassword.trim()) {
      return showMessage("Enter new password first", true);
    }
    await api(`/api/admin/password-resets/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify({ action, newPassword })
    });
    showMessage(`Password reset request ${action}d`);
    await loadPasswordResets();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function submitForgotPassword(e) {
  e.preventDefault();
  try {
    const email = el.forgotEmail.value.trim();
    const message = el.forgotMessage.value.trim();
    if (!validEmail(email)) {
      return showMessage("Please enter a valid email address", true);
    }
    const data = await api("/api/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email, message })
    });
    showMessage(data.message || "Reset request sent");
    el.forgotForm.classList.add("hidden");
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function reviewRequest(id, action) {
  try {
    await api(`/api/admin/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action })
    });
    showMessage(`Request ${action}d`);
    await loadPending();
  } catch (error) {
    showMessage(error.message, true);
  }
}

function safeAddListener(elName, event, callback) {
  if (el[elName]) {
    el[elName].addEventListener(event, callback);
  }
}

safeAddListener("loginTab", "click", () => setTab("login"));
safeAddListener("registerTab", "click", () => setTab("register"));
safeAddListener("registerRole", "change", toggleAdminCodeField);
safeAddListener("loginForm", "submit", onLogin);
safeAddListener("forgotForm", "submit", submitForgotPassword);
safeAddListener("registerForm", "submit", onRegister);
safeAddListener("logoutBtn", "click", logout);
safeAddListener("forgotToggleBtn", "click", () => {
  el.forgotForm.classList.toggle("hidden");
});
safeAddListener("themeToggle", "click", toggleTheme);

if (el.exportCsvBtn) {
  el.exportCsvBtn.addEventListener("click", () => {
    window.open("/api/admin/export/today?token=" + state.token, "_blank");
  });
}

safeAddListener("refreshMeBtn", "click", async () => {
  try {
    await refreshMe();
    await loadStudentData();
    showMessage("Refreshed");
  } catch (error) {
    showMessage(error.message, true);
  }
});

safeAddListener("sendRequestBtn", "click", async () => {
  try {
    const message = el.requestMsg.value.trim();
    const dateKey = el.requestDate.value;
    if (!message) return showMessage("Enter reason for leave", true);
    if (!dateKey) return showMessage("Select a date", true);

    await api("/api/requests", {
      method: "POST",
      body: JSON.stringify({ message, dateKey })
    });
    showMessage("Request sent");
    el.requestMsg.value = "";
    await loadStudentData();
  } catch (error) {
    showMessage(error.message, true);
  }
});

safeAddListener("searchBtn", "click", searchAttendance);
safeAddListener("searchName", "input", () => {
  if (suggestionTimer) {
    clearTimeout(suggestionTimer);
  }
  suggestionTimer = setTimeout(() => {
    loadUserSuggestions(el.searchName.value);
  }, 180);
});
safeAddListener("loadPendingBtn", "click", loadPending);
safeAddListener("loadResetRequestsBtn", "click", loadPasswordResets);
safeAddListener("updateAdminPhoneBtn", "click", updateAdminPhone);

document.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest(".password-toggle");
  if (toggleBtn) {
    togglePasswordVisibility(toggleBtn);
  }
});

toggleAdminCodeField();
applyTheme();
initSession();
