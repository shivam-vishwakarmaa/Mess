# 🍽️ Mess Attendance Pro

A powerful, high-performance attendance and leave management system for students and mess admins. Designed for high-contrast visibility and a premium "Glassmorphism" user experience.

---

## 🚀 Key Features

### 👨‍🎓 For Students
- **Smart Dashboard**: View your joining date, days left in your 30-day cycle, and current status instantly.
- **Advanced Leave Requests**: 
  - Request leave for **today or any future date** using the built-in Date Picker.
  - Automatically prevents attendance marking for approved leave dates.
- **Easy Password Recovery**: Send reset requests with custom messages to admins (no email required).
- **Admin Contact**: View the admin's contact number directly in your dashboard for quick help.
- **Premium UI**: Seamlessly switch between **Light Mode** and **Dark Mode** with an animated toggle.

### 👑 For Admins
- **Global Metrics**: Live count of "Total Students" and "Students Eating Today".
- **Intelligent Search**: Real-time suggestions as you type. Search by Name or Username.
- **User Management**:
  - Edit student details (Phone, Email, Name, Username).
  - **30-Day Cycle Renewals**: Extend a student's membership by +30 days with a single click after payment.
  - Change student passwords or delete accounts instantly.
- **Expiring Soon Alert**: A dedicated list of students whose membership ends in 5 days or less.
- **Leave Request Terminal**: Approve or reject pending leave requests with real-time updates.
- **Password Reset Terminal**: Review and fulfill password change requests.
- **CSV Data Export**: One-click download of today's attendance summary for offline records.
- **Global Contact Setting**: Set your phone number so all students can see it in their dashboard.

---

## 🛠️ Tech Stack

- **Backend**: Node.js & Express.js
- **Database**: MongoDB (Atlas compatible) with TTL indexing for auto-cleanup of old records.
- **Auth**: Secure JWT (JSON Web Tokens) with Role-Based Access Control (RBAC).
- **Security**: 
  - Password hashing with `bcryptjs`.
  - **API Rate Limiting**: Protection against brute-force and DDoS attempts.
- **Frontend**: Pure Vanilla JS, HTML5, and CSS3. No heavy frameworks!
- **UI Design**: Modern Glassmorphism using `backdrop-filter`, HSL color tokens, and Google Fonts (Outfit & Space Grotesk).

---

## ⚙️ Setup & Installation

1. **Clone & Install**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file from the example:
   ```bash
   # .env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_key
   ADMIN_REGISTRATION_CODE=secret_key_to_create_admin_accounts
   TZ=Asia/Kolkata
   ```

3. **Execution**:
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

---

## 💡 Understanding the "Renewal" Logic

We use a "Cycle-based" system instead of monthly dates:
1. When a student joins, they get **30 days**.
2. If they pay for another month, the Admin clicks **"Renew Cycle (+30 days)"**.
3. This increments the `renewals` count by 1, automatically adding **30 more days** to their expiration without needing to change their joining date.
4. Any "Approved Leave Requests" are **added back** to their days left (e.g., if they were on leave for 2 days, they get 2 extra days in their cycle).

---

## 📡 API Overview

| Endpoint | Method | Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/auth/register` | `POST` | All | Create student/admin account |
| `/api/auth/login` | `POST` | All | Authenticate and get JWT |
| `/api/requests` | `POST` | Student | Send a leave request for a specific date |
| `/api/admin/metrics` | `GET` | Admin | Get global stats and expiring soon list |
| `/api/admin/attendance/search` | `GET` | Admin | Search students with detailed stats |
| `/api/admin/users/:id/renew` | `PUT` | Admin | Manually add +30 days to a user cycle |
| `/api/admin/export/today` | `GET` | Admin | Download current attendance as CSV |

---

## 📱 Mobile Support
The app is fully responsive. On mobile devices, the theme toggle and admin tools are optimized for touch and smaller viewports.

---

*Built with ❤️ for efficient Mess Management.*
