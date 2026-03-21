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
  mainContainer: document.getElementById("mainContainer"),
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
  viewSections: document.querySelectorAll(".view-section"),
  navBtns: document.querySelectorAll(".sidebar-nav .nav-btn"),
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
  themeToggle: document.querySelectorAll(".theme-toggle, #appThemeToggle"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  registerPhone: document.getElementById("registerPhone"),
  adminContactDisplay: document.getElementById("adminContactDisplay"),
  adminMyPhone: document.getElementById("adminMyPhone"),
  updateAdminPhoneBtn: document.getElementById("updateAdminPhoneBtn"),
  requestDate: document.getElementById("requestDate"),
  pendingRequests: document.getElementById("pendingRequests"),
  appSidebar: document.getElementById("appSidebar"),
  mobileMenuBtn: document.getElementById("mobileMenuBtn"),
  topUserName: document.getElementById("topUserName"),
  sidebarUserName: document.getElementById("sidebarUserName"),
  sidebarUserRole: document.getElementById("sidebarUserRole")
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
  el.mainContainer.classList.toggle("hidden", loggedIn);
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
  el.themeToggle.forEach(btn => {
    btn.textContent = isLight ? "🌙" : "🌞";
  });
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
  el.welcomeText.textContent = `Welcome, ${state.user.name}`;
  el.topUserName.textContent = state.user.name;
  el.sidebarUserName.textContent = state.user.name;

  const formattedRole = state.user.role === "admin" ? "System Administrator" : "Student";
  el.sidebarUserRole.textContent = formattedRole;

  if (state.user.role === "admin") {
    el.metaText.innerHTML = `<span class="icon">📅</span> Joining date: ${formatDate(state.user.joiningDate)}`;
  } else {
    el.metaText.innerHTML = `<span class="icon">📅</span> Joining date: ${formatDate(
      state.user.joiningDate
    )} | Days left for 30-day cycle: <strong style="color:var(--text-main);">${state.user.daysLeftFor30}</strong>`;
  }
}

async function refreshMe() {
  const data = await api("/api/auth/me");
  state.user = data.user;
  state.stats = data.stats || {};
  drawUserHeader();
  setAuthUI(true);
  const isAdmin = state.user.role === "admin";
  
  // Wire dynamic visibility based on Role
  if (!isAdmin) {
    el.navBtns.forEach(btn => {
      const t = btn.getAttribute("data-target");
      if (t !== "view-dashboard") btn.classList.add("hidden");
    });
    document.querySelectorAll(".side-card").forEach(c => c.classList.add("hidden"));
    
    // Move student panel to dashboard for students
    const dashMain = document.querySelector("#view-dashboard .main-column");
    if (dashMain && el.studentPanel) dashMain.appendChild(el.studentPanel);
    if (el.studentPanel) el.studentPanel.classList.remove("hidden");
    
  } else {
    el.navBtns.forEach(btn => btn.classList.remove("hidden"));
    document.querySelectorAll(".side-card").forEach(c => c.classList.remove("hidden"));
    if (el.studentPanel) el.studentPanel.classList.add("hidden");
  }

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
  totalCard.style.cssText = "display:flex; flex-direction:row; justify-content:flex-start; gap:20px; align-items:center;";
  totalCard.innerHTML = `
    <div style="background:rgba(124, 58, 237, 0.15); color:var(--brand-primary); padding:16px; border-radius:50%; font-size:1.5rem; line-height:1;">
       👥
    </div>
    <div style="display:flex; flex-direction:column; gap:4px; text-align:left;">
       <span class="stat-label" style="text-align:left;">Total Students</span>
       <span class="stat-val" style="font-size:2.5rem; text-align:left;">${stats.totalStudents}</span>
    </div>
  `;

  const eatCard = document.createElement("div");
  eatCard.className = "stat-card";
  eatCard.style.cssText = "display:flex; flex-direction:row; justify-content:flex-start; gap:20px; align-items:center;";
  eatCard.innerHTML = `
    <div style="background:rgba(6, 182, 212, 0.15); color:var(--brand-secondary); padding:16px; border-radius:50%; font-size:1.5rem; line-height:1;">
       🍴
    </div>
    <div style="display:flex; flex-direction:column; gap:4px; text-align:left;">
       <span class="stat-label" style="text-align:left;">Eating Today</span>
       <span class="stat-val" style="font-size:2.5rem; text-align:left;">${stats.todayEaters}</span>
    </div>
  `;

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
        daysLine.className = user.daysLeft <= 0 ? "days-expired" : "days-warning";
        daysLine.textContent = user.daysLeft <= 0 ? `⚠ ${user.daysLeft} day(s) left` : `⚠ ${user.daysLeft} day(s) left`;
        // And if exactly 0, maybe explicitly say EXPIRED too
        if (user.daysLeft <= 0) daysLine.textContent = `⚠ EXPIRED (0 days left)`;
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
      const item = document.createElement("div");
      item.className = "student-card";

      // Badge logic
      const isExpiring = user.daysLeftFor30 <= 5;
      const badgeHtml = isExpiring
        ? `<span class="badge" style="background:rgba(239, 68, 68, 0.2); color:var(--danger)">EXPIRING SOON</span>`
        : `<span class="badge badge-active">ACTIVE</span>`;

      item.innerHTML = `
        <div class="student-card-header">
           <div>
             <h3 style="margin:0; font-size:1.3rem;">${user.name} <span class="muted" style="font-weight:400; font-size:1rem;">(@${user.username || 'N/A'})</span></h3>
             <div class="muted" style="font-size:0.85rem; margin-top:4px;"><span class="icon">✉️</span> ${user.email}</div>
           </div>
           <div>${badgeHtml}</div>
        </div>
        <div class="student-card-stats">
           <div class="stat-box">
             <span class="stat-box-label">Phone</span>
             <span class="stat-box-value">${user.phoneNumber || "N/A"}</span>
           </div>
           <div class="stat-box">
             <span class="stat-box-label">Joined</span>
             <span class="stat-box-value">${formatDate(user.joiningDate)}</span>
           </div>
           <div class="stat-box">
             <span class="stat-box-label">Days Left</span>
             <span class="stat-box-value" style="color:var(--brand-secondary);">${user.daysLeftFor30} Days</span>
           </div>
           <div class="stat-box">
             <span class="stat-box-label">Renewals</span>
             <span class="stat-box-value">${user.renewals || 0}</span>
           </div>
           <div class="stat-box">
             <span class="stat-box-label">Extra</span>
             <span class="stat-box-value">${user.extraDays || 0}</span>
           </div>
        </div>
      `;

      const actionRow = document.createElement("div");
      actionRow.className = "row";
      actionRow.style.marginTop = "8px";

      const editBtn = document.createElement("button");
      editBtn.className = "secondary";
      editBtn.textContent = "Edit Details";
      editBtn.style.padding = "10px 16px";

      actionRow.appendChild(editBtn);
      item.appendChild(actionRow);

      const editForm = document.createElement("div");
      editForm.className = "form hidden";
      editForm.style.marginTop = "15px";
      editForm.style.padding = "20px";
      editForm.style.background = "rgba(255,255,255,0.02)";
      editForm.style.borderRadius = "12px";
      editForm.style.border = "1px solid var(--glass-border)";

      const uId = user.id || user._id;
      editForm.innerHTML = `
        <div class="row wrap" style="gap: 10px;">
          <input type="text" value="${user.name}" placeholder="Full Name" id="editName_${uId}" />
          <input type="text" value="${user.username || ""}" placeholder="Username" id="editUsername_${uId}" />
          <input type="email" value="${user.email}" placeholder="Email" id="editEmail_${uId}" />
          <input type="tel" value="${user.phoneNumber || ""}" placeholder="Phone" id="editPhone_${uId}" />
          <div class="row wrap" style="gap: 5px; flex: 1;">
            <label style="font-size: 0.8rem; opacity: 0.7;">Renewals (Manual extensions):</label>
            <input type="number" min="0" value="${user.renewals || 0}" placeholder="Renewals" id="editRenewals_${uId}" />
          </div>
          <div class="row wrap" style="gap: 5px; flex: 1;">
            <label style="font-size: 0.8rem; opacity: 0.7;">Extra Days (Adjust days left):</label>
            <input type="number" value="${user.extraDays || 0}" placeholder="Extra Days" id="editExtraDays_${uId}" />
          </div>
          <input type="password" placeholder="New Password (optional)" id="editPassword_${uId}" />
        </div>
        <div class="row wrap" style="margin-top: 10px; gap: 10px;">
          <button class="save-btn" style="background: #2a5a3a;">Save Changes</button>
          <button class="danger delete-btn">Delete User</button>
        </div>
      `;

      editBtn.addEventListener("click", () => {
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
          extraDays: parseInt(document.getElementById(`editExtraDays_${uId}`).value),
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
el.themeToggle.forEach(btn => {
  btn.addEventListener("click", toggleTheme);
});

// Mobile Sidebar & Tab View Logic
if (el.navBtns) {
  el.navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      if (!targetId) return;

      // Unset active class on all buttons & views
      el.navBtns.forEach(b => b.classList.remove("active"));
      el.viewSections.forEach(v => v.classList.add("hidden"));
      
      // Set active on clicked button and respective view
      btn.classList.add("active");
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.classList.remove("hidden");
      
      // Close mobile menu
      if (el.appSidebar) {
         el.appSidebar.classList.remove("mobile-open");
      }
    });
  });
}

if (el.mobileMenuBtn) {
  el.mobileMenuBtn.addEventListener("click", () => {
    el.appSidebar.classList.toggle("mobile-open");
  });

  // Close menu if clicked outside sidebar when open
  document.addEventListener("click", (e) => {
    if (el.appSidebar && el.appSidebar.classList.contains("mobile-open")) {
      if (!el.appSidebar.contains(e.target) && !el.mobileMenuBtn.contains(e.target)) {
        el.appSidebar.classList.remove("mobile-open");
      }
    }
  });
}

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
