const state = {
  token: localStorage.getItem("token") || "",
  user: null
};

const el = {
  authSection: document.getElementById("authSection"),
  appSection: document.getElementById("appSection"),
  loginTab: document.getElementById("loginTab"),
  registerTab: document.getElementById("registerTab"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
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
  requestDate: document.getElementById("requestDate"),
  requestMsg: document.getElementById("requestMsg"),
  sendRequestBtn: document.getElementById("sendRequestBtn"),
  myRequestList: document.getElementById("myRequestList"),
  searchName: document.getElementById("searchName"),
  searchBtn: document.getElementById("searchBtn"),
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

  el.myAttendanceList.innerHTML = attendanceRes.attendance
    .map(
      (a) =>
        `<div class="item"><strong>${a.dateKey}</strong> | ${a.status} | by ${a.markedBy}</div>`
    )
    .join("");

  el.myRequestList.innerHTML = requestsRes.requests
    .map(
      (r) =>
        `<div class="item"><strong>${r.dateKey}</strong> | ${r.status} | ${r.message}</div>`
    )
    .join("");

  if (markRes.approvedDateKeysOpen.length) {
    showMessage(
      `You can mark approved date(s): ${markRes.approvedDateKeysOpen.join(", ")}`
    );
  }
}

async function onLogin(e) {
  e.preventDefault();
  try {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
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
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
    state.token = data.token;
    localStorage.setItem("token", state.token);
    await refreshMe();
    await loadStudentData();
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

  try {
    const data = await api(`/api/admin/attendance/search?name=${encodeURIComponent(name)}`);
    el.searchUsers.innerHTML = data.users
      .map(
        (u) =>
          `<div class="item"><strong>${u.name}</strong> (${u.email}) | Joined: ${formatDate(
            u.joiningDate
          )} | Days left: ${u.daysLeftFor30}</div>`
      )
      .join("");

    el.searchAttendance.innerHTML = data.attendance
      .map(
        (a) => `<div class="item">
          <strong>${a.user?.name || "Unknown"}</strong> | ${a.dateKey} | ${a.status} | ${a.markedBy}
          <div class="row wrap">
            <button class="secondary" onclick="adminSetStatus('${a._id}','present')">Set Present</button>
            <button class="secondary" onclick="adminSetStatus('${a._id}','absent')">Set Absent</button>
          </div>
        </div>`
      )
      .join("");
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

window.adminSetStatus = adminSetStatus;

async function loadPending() {
  try {
    const data = await api("/api/admin/requests?status=pending");
    el.pendingRequests.innerHTML = data.requests
      .map(
        (r) => `<div class="item">
          <strong>${r.user?.name || "Unknown"}</strong> | ${r.dateKey}<br />
          ${r.message}
          <div class="row wrap">
            <button class="approve" onclick="reviewRequest('${r._id}','approve')">Yes</button>
            <button class="danger" onclick="reviewRequest('${r._id}','reject')">No</button>
          </div>
        </div>`
      )
      .join("");
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

window.reviewRequest = reviewRequest;

el.loginTab.addEventListener("click", () => setTab("login"));
el.registerTab.addEventListener("click", () => setTab("register"));
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
    const dateKey = el.requestDate.value;
    const message = el.requestMsg.value.trim();
    if (!message) return showMessage("Enter message", true);
    await api("/api/requests", {
      method: "POST",
      body: JSON.stringify(dateKey ? { dateKey, message } : { message })
    });
    showMessage("Request sent");
    await loadStudentData();
  } catch (error) {
    showMessage(error.message, true);
  }
});

el.searchBtn.addEventListener("click", searchAttendance);
el.loadPendingBtn.addEventListener("click", loadPending);

initSession();
