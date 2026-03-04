# Mess Attendance App

JWT-authenticated attendance app for students and admins, designed for 100+ users.

## Features

- Student registration/login with JWT
- Admin registration protected by private `ADMIN_REGISTRATION_CODE`
- Optional admin bootstrap user from `.env`
- Students mark attendance manually
- Auto-mark `present` every day at `11:00 PM` (timezone from `TZ`) if not marked
- Students can request admin to keep attendance empty for a date with a message
- Admin approves/rejects requests with one click
- If approved, that date is not auto-marked, and student can mark it later
- Admin can search students by name and view attendance
- Admin can edit attendance status
- Automatic deletion of attendance/request records after 30 days (TTL index)
- Student/admin can see joining date and days left in 30-day cycle
- Responsive animated UI

## Tech Stack

- Node.js + Express
- MongoDB Atlas (free tier compatible)
- Mongoose
- JWT
- Vanilla HTML/CSS/JS frontend

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from example:

```bash
copy .env.example .env
```

3. Update `.env` values:

- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_REGISTRATION_CODE` (share only with trusted admins)
- Optional bootstrap admin: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`

4. Start app:

```bash
npm run dev
```

or

```bash
npm start
```

5. Open:

`http://localhost:5000`

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/attendance/me`
- `GET /api/attendance/can-mark`
- `POST /api/attendance/mark`
- `POST /api/requests`
- `GET /api/requests/me`
- `GET /api/admin/attendance/search?name=...` (admin)
- `PUT /api/admin/attendance/:id` (admin)
- `POST /api/admin/attendance` (admin)
- `GET /api/admin/requests?status=pending` (admin)
- `PATCH /api/admin/requests/:id` (admin)

## Deployment

Deploy easily on Render/Railway/Vercel (Node server) with these env vars:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `TZ`
- `ADMIN_REGISTRATION_CODE`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Use a MongoDB Atlas free instance as database.

## Auth Role Flow

- Login form has role selection (`User` / `Admin`)
- Register form has role selection
- If `Admin` is selected on register, `Admin Secret Code` is required
- Backend verifies secret code against `ADMIN_REGISTRATION_CODE`
