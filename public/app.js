const state = {
  token: localStorage.getItem("token") || "",
  user: null
};
let suggestionTimer = null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const el = {
  authSection: document.getElementById("authSection"),
  appSection: document.getElementById("appSection"),
  loginTab: document.getElementById("loginTab"),
  registerTab: document.getElementById("registerTab"),
  loginForm: document.getElementById("loginForm"),
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
  markTodayBtn: document.getElementById("markTodayBtn"),
  refreshMeBtn: document.getElementById("refreshMeBtn"),
  markDateInput: document.getElementById("markDateInput"),
  markDateBtn: document.getElementById("markDateBtn"),
  myAttendanceList: document.getElementById("myAttendanceList"),
  requestMsg: document.getElementById("requestMsg"),
  sendRequestBtn: document.getElementById("sendRequestBtn"),
  myRequestList: document.getElementById("myRequestList"),
  searchName: document.getElementById("searchName"),
  searchBtn: document.getElementById("searchBtn"),
  searchSuggestions: document.getElementById("searchSuggestions"),
  searchUsers: document.getElementById("searchUsers"),
  searchAttendance: document.getElementById("searchAttendance"),
  loadPendingBtn: document.getElementById("loadPendingBtn"),
  pendingRequests: document.getElementById("pendingRequests")
};

function showMessage(text, isError = false) {
  el.messageBox.textContent = text;
  el.messageBox.style.background = isError ? "#712a2a" : "#1f332e";
  el.messageBox.classList.add("show");
  setTimeout(() => el.messageBox.classList.remove("show"), 2500);
}

function clearNode(node) {
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

function validStrongPassword(password) {
  return STRONG_PASSWORD_REGEX.test(password);
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
  const targetId = button.getAttribute("data-target");
  const input = document.getElementById(targetId);
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

function drawUserHeader() {
  el.welcomeText.textContent = `Welcome, ${state.user.name} (${state.user.role})`;
  el.metaText.textContent = `Joining date: ${formatDate(
    state.user.joiningDate
  )} | Days left for 30-day cycle: ${state.user.daysLeftFor30}`;
}

async function refreshMe() {
  const data = await api("/api/auth/me");
  state.user = data.user;
  drawUserHeader();
  setAuthUI(true);
  const isAdmin = state.user.role === "admin";
  el.studentPanel.classList.toggle("hidden", isAdmin);
  el.adminPanel.classList.toggle("hidden", !isAdmin);
}

async function loadStudentData() {
  const [attendanceRes, requestsRes, markRes] = await Promise.all([
    api("/api/attendance/me"),
    api("/api/requests/me"),
    api("/api/attendance/can-mark")
  ]);

  clearNode(el.myAttendanceList);
  attendanceRes.attendance.forEach((attendance) => {
    const item = makeItem();
    appendTextLine(
      item,
      `${attendance.dateKey} | ${attendance.status} | by ${attendance.markedBy}`
    );
    el.myAttendanceList.appendChild(item);
  });

  clearNode(el.myRequestList);
  requestsRes.requests.forEach((request) => {
    const item = makeItem();
    appendTextLine(item, `${request.dateKey} | ${request.status}`);
    appendTextLine(item, request.message);
    el.myRequestList.appendChild(item);
  });

  if (markRes.approvedDateKeysOpen.length) {
    showMessage(
      `You can mark approved date(s): ${markRes.approvedDateKeysOpen.join(", ")}`
    );
  }
}

async function onLogin(e) {
  e.preventDefault();
  try {
    const role = el.loginRole.value;
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!validEmail(email)) {
      return showMessage("Please enter a valid email address", true);
    }
    if (!password) {
      return showMessage("Password is required", true);
    }

    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role })
    });
    state.token = data.token;
    localStorage.setItem("token", state.token);
    await refreshMe();
    if (state.user.role === "student") await loadStudentData();
    showMessage("Login successful");
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function onRegister(e) {
  e.preventDefault();
  try {
    const role = el.registerRole.value;
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const adminCode = el.adminCode.value.trim();

    if (!name || name.length < 2) {
      return showMessage("Name must be at least 2 characters", true);
    }
    if (!validEmail(email)) {
      return showMessage("Please enter a valid email address", true);
    }
    if (!validStrongPassword(password)) {
      return showMessage(
        "Password must be 8+ chars with upper, lower, number, and special character",
        true
      );
    }
    if (role === "admin" && !adminCode) {
      return showMessage("Admin secret code is required", true);
    }

    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role, adminCode })
    });
    state.token = data.token;
    localStorage.setItem("token", state.token);
    await refreshMe();
    if (state.user.role === "student") await loadStudentData();
    if (state.user.role === "admin") await loadPending();
    showMessage("Account created");
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function markAttendance(dateKey) {
  await api("/api/attendance/mark", {
    method: "POST",
    body: JSON.stringify(dateKey ? { dateKey } : {})
  });
}

async function initSession() {
  if (!state.token) {
    setAuthUI(false);
    return;
  }

  try {
    await refreshMe();
    if (state.user.role === "student") await loadStudentData();
    if (state.user.role === "admin") await loadPending();
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
      appendTextLine(item, `${user.name} (${user.email})`);
      appendTextLine(
        item,
        `Joined: ${formatDate(user.joiningDate)} | Days left: ${user.daysLeftFor30}`
      );

      const actionRow = document.createElement("div");
      actionRow.className = "row wrap";

      const dateInput = document.createElement("input");
      dateInput.type = "date";

      const presentBtn = document.createElement("button");
      presentBtn.className = "approve";
      presentBtn.textContent = "Mark Present";
      presentBtn.addEventListener("click", async () => {
        await adminCreateAttendance(user.id, "present", dateInput.value);
      });

      const absentBtn = document.createElement("button");
      absentBtn.className = "danger";
      absentBtn.textContent = "Mark Absent";
      absentBtn.addEventListener("click", async () => {
        await adminCreateAttendance(user.id, "absent", dateInput.value);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "danger";
      deleteBtn.textContent = "Delete User";
      deleteBtn.addEventListener("click", async () => {
        await adminDeleteUser(user.id, user.name);
      });

      actionRow.appendChild(dateInput);
      actionRow.appendChild(presentBtn);
      actionRow.appendChild(absentBtn);
      actionRow.appendChild(deleteBtn);
      item.appendChild(actionRow);
      el.searchUsers.appendChild(item);
    });

    clearNode(el.searchAttendance);
    data.attendance.forEach((attendance) => {
      const item = makeItem();
      appendTextLine(
        item,
        `${attendance.user?.name || "Unknown"} | ${attendance.dateKey} | ${attendance.status} | ${
          attendance.markedBy
        }`
      );

      const actionRow = document.createElement("div");
      actionRow.className = "row wrap";

      const presentBtn = document.createElement("button");
      presentBtn.className = "secondary";
      presentBtn.textContent = "Set Present";
      presentBtn.addEventListener("click", () => adminSetStatus(attendance._id, "present"));

      const absentBtn = document.createElement("button");
      absentBtn.className = "secondary";
      absentBtn.textContent = "Set Absent";
      absentBtn.addEventListener("click", () => adminSetStatus(attendance._id, "absent"));

      actionRow.appendChild(presentBtn);
      actionRow.appendChild(absentBtn);
      item.appendChild(actionRow);
      el.searchAttendance.appendChild(item);
    });
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function adminSetStatus(id, status) {
  try {
    await api(`/api/admin/attendance/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status })
    });
    showMessage("Attendance updated");
    await searchAttendance();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function adminCreateAttendance(userId, status, dateKey) {
  try {
    if (!dateKey) {
      showMessage("Select a date first", true);
      return;
    }
    await api("/api/admin/attendance", {
      method: "POST",
      body: JSON.stringify({ userId, dateKey, status })
    });
    showMessage(`Marked ${status} successfully`);
    await searchAttendance();
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

el.loginTab.addEventListener("click", () => setTab("login"));
el.registerTab.addEventListener("click", () => setTab("register"));
el.registerRole.addEventListener("change", toggleAdminCodeField);
el.loginForm.addEventListener("submit", onLogin);
el.registerForm.addEventListener("submit", onRegister);
el.logoutBtn.addEventListener("click", logout);

el.markTodayBtn.addEventListener("click", async () => {
  try {
    await markAttendance();
    showMessage("Attendance marked");
    await loadStudentData();
  } catch (error) {
    showMessage(error.message, true);
  }
});

el.markDateBtn.addEventListener("click", async () => {
  try {
    const dateKey = el.markDateInput.value;
    if (!dateKey) return showMessage("Select date", true);
    await markAttendance(dateKey);
    showMessage(`Attendance marked for ${dateKey}`);
    await loadStudentData();
  } catch (error) {
    showMessage(error.message, true);
  }
});

el.refreshMeBtn.addEventListener("click", async () => {
  try {
    await refreshMe();
    await loadStudentData();
    showMessage("Refreshed");
  } catch (error) {
    showMessage(error.message, true);
  }
});

el.sendRequestBtn.addEventListener("click", async () => {
  try {
    const message = el.requestMsg.value.trim();
    if (!message) return showMessage("Enter message", true);
    await api("/api/requests", {
      method: "POST",
      body: JSON.stringify({ message })
    });
    showMessage("Request sent");
    await loadStudentData();
  } catch (error) {
    showMessage(error.message, true);
  }
});

el.searchBtn.addEventListener("click", searchAttendance);
el.searchName.addEventListener("input", () => {
  if (suggestionTimer) {
    clearTimeout(suggestionTimer);
  }
  suggestionTimer = setTimeout(() => {
    loadUserSuggestions(el.searchName.value);
  }, 180);
});
el.loadPendingBtn.addEventListener("click", loadPending);
document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => togglePasswordVisibility(button));
});

toggleAdminCodeField();
initSession();
