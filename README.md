# MindSupport

MindSupport is a full-stack student mental health platform built with Vite, React, Redux, Tailwind/shadcn UI, Node.js, Express, and MongoDB.

## Features

- JWT authentication with role authorization for users, counsellors, and admins
- Mongo-backed OTP account verification
- Socket.io live updates for secure messages and notifications
- Separate dashboards:
  - User dashboard for wellness status, bookings, Google Meet sessions, private journal, payments, notifications, and counsellor messaging
  - Counsellor dashboard for session requests, care notes, patient progress, secure messages, ratings, earnings, and Meet links
  - Admin dashboard for role management, counsellor applications, review moderation, reports, notifications, resources, and session oversight
- Confidential appointment booking backed by MongoDB
- Counsellor application flow: every new account starts as a user, then admin approves mentor/professional access
- Anonymous counselling mode with admin safety visibility
- Rating and review moderation with low-score flagging
- Google Meet service option for online counselling sessions
- Resource hub, peer support, mood tracking, assessments, notifications, payments, and emergency support routes
- ReactBits-style reusable animated UI panel in `src/components/reactbits`

## Tech Stack

- Frontend: HTML, CSS, JavaScript, React, Redux Toolkit, React Router, Tailwind, shadcn/ui
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.io
- Auth: bcrypt password hashing and JWT bearer tokens
- JavaScript-only project with MongoDB-only persistence

## Backend Structure

- `backend/server.js` - small Node entrypoint that starts the API
- `backend/src/app.js` - Express app setup, middleware, shared route helpers, static frontend serving
- `backend/src/config/env.js` - environment configuration
- `backend/src/database/connect.js` - MongoDB connection lifecycle
- `backend/src/database/seed.js` - starter wellness resource seeding
- `backend/scripts/create-admin.js` - manual admin account creation
- `backend/src/models/index.js` - Mongoose schemas and models
- `backend/src/realtime/socket.js` - Socket.io authentication and room setup
- `backend/src/routes/index.js` - route module loader
- `backend/src/routes/*.routes.js` - separated REST routes for auth, applications, users, chat, payments/notifications, counsellors, admins, marketplace/bookings, resources, peer support, wellness, and analytics

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set at least:

```bash
VITE_API_BASE_URL=http://localhost:5001
MONGODB_URI=mongodb://127.0.0.1:27017/mindsupport
JWT_SECRET=replace-with-a-long-random-secret
```

3. Start MongoDB locally, then run the app:

```bash
npm run dev:full
```

Frontend runs on `http://localhost:8080`.
API runs on `http://localhost:5001`.

## Manual Admin Account

Admin accounts are not available in signup or admin-created account forms. Create one manually from the backend:

```bash
npm run create:admin -- owner@example.com strong-password "Owner Name"
```

## Scripts

- `npm run dev` - Vite frontend only
- `npm run dev:api` - Express API with Node watch mode
- `npm run dev:full` - frontend and backend together
- `npm run server` - Express API
- `npm run build` - production frontend build
- `npm run preview` - preview built frontend

## Important Routes

- `/login` - role-aware sign in
- `/signup` - normal user registration; counsellor access is requested from the user dashboard
- `/dashboard` - redirects to the current user's dashboard
- `/user` - user dashboard
- `/counsellor` - counsellor dashboard
- `/admin` - admin dashboard
- `/book` - protected session booking with Google Meet option
- `/wellness` - protected wellness tools
- `/peer` - protected peer support
- `/resources` - resource hub

## API Highlights

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `GET /api/user/dashboard`
- `GET /api/counsellor/dashboard`
- `GET /api/admin/dashboard`
- `POST /api/counsellor-applications`
- `PATCH /api/admin/counsellor-applications/:id`
- `POST /api/appointments`
- `PUT /api/appointments/:id`
- `POST /api/meet/create`
- `POST /api/messages`
- `POST /api/journals`
- `POST /api/payments/session`
- `POST /api/reviews`
- `PATCH /api/admin/reviews/:id`
- `GET /api/resources`
- `POST /api/wellness/mood`
- `POST /api/wellness/assessment`

## Google Meet

Set `GOOGLE_MEET_DEFAULT_LINK` to a reusable Meet room if your institution has one. If it is empty, the counsellor dashboard and booking flow use `https://meet.google.com/new`, which lets a signed-in counsellor create/start a Meet session.
