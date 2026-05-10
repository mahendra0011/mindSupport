# MindSupport

MindSupport is a full-stack mental wellness and counselling platform built with React, Redux Toolkit, Tailwind CSS, Node.js, Express, Socket.io, and MongoDB. It includes separate user, counsellor, and admin experiences with JWT authentication, role-based authorization, counsellor approval, session booking, Google Meet support, wellness tracking, resources, chat, payments, reviews, and emergency support.

This project is JavaScript-only and MongoDB-only.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript, React, React Router, Redux Toolkit |
| Styling | Tailwind CSS, shadcn/ui, Radix UI, Lucide icons, ReactBits-style UI components |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth | JWT bearer tokens, bcrypt password hashing, OTP verification routes |
| Real-time | Socket.io |
| Video sessions | Google Meet link flow |

## Main Features

- Role-aware authentication for users, counsellors, and admins.
- Manual admin creation only. Admin signup is not available from the UI.
- User signup and counsellor signup only.
- Counsellor accounts are created in a pending state and cannot access the counsellor dashboard until an admin approves them.
- Admin dashboard for users, counsellor approvals, reports, sessions, revenue, resources, notifications, analytics, and review moderation.
- User dashboard for booking, wellness status, mood tracking, journal, resources, payments, notifications, chat, anonymous counselling, and emergency support.
- Counsellor dashboard for booking requests, patient management, session notes, schedule, messaging, reviews, earnings, and Google Meet sessions.
- Public counsellor marketplace with filters, badges, reviews, and booking.
- Wellness dashboard with mood tracking, PHQ-9/GAD-7 style assessments, resources, breathing support, emergency hotlines, and notifications.
- MongoDB-only persistence through structured Mongoose models.
- Proper backend folder structure with route modules instead of putting everything in one `server.js`.

## Role Flow

### User

Users can create a normal account, log in, access the user dashboard, book sessions, track mood, use resources, message counsellors, pay for sessions, and use emergency support.

### Counsellor

Counsellors select the counsellor account type during signup. The signup form collects verification details such as bio, specialization, experience, languages, pricing, profile photo URL, certificates, LinkedIn or portfolio, ID details, education, availability, counselling type, and references.

After signup:

- `role = counsellor`
- `status = pending`
- `verificationStatus = pending`
- admin receives a counsellor application
- counsellor dashboard access stays locked until approval

### Admin

Admins are created manually from the backend script. Admins review counsellor applications, approve or reject counsellors, manage platform users, monitor sessions, review reports, moderate reviews, manage resources, and view analytics.

## Project Structure

```text
mindSupport-main/
  .env.example                 # Example environment variables
  index.html                   # Vite HTML entry
  package.json                 # Scripts and dependencies
  vite.config.js               # Vite config and /api proxy
  tailwind.config.js           # Tailwind theme config
  components.json              # shadcn/ui config
  public/                      # Static public assets

  backend/
    server.js                  # Small API entrypoint
    .env.example               # Backend env reference
    scripts/
      create-admin.js          # Manual admin account creation
    src/
      app.js                   # Express app, middleware, helpers
      config/
        env.js                 # Environment config
      database/
        connect.js             # MongoDB connection
        seed.js                # Starter resource seeding
      models/
        index.js               # Mongoose schemas and models
      realtime/
        socket.js              # Socket.io auth and rooms
      routes/
        index.js               # Registers all route modules
        auth.routes.js         # Register, login, OTP, current user
        applications.routes.js # Counsellor application flow
        user.routes.js         # User dashboard, journals
        counsellor.routes.js   # Counsellor dashboard, Meet service
        admin.routes.js        # Admin dashboard and moderation
        marketplace.routes.js  # Counsellors, appointments, reviews
        communication.routes.js
        notifications.routes.js
        resources.routes.js
        peer.routes.js
        wellness.routes.js
        analytics.routes.js

  src/
    assets/                    # Frontend images and static imports
    components/                # Shared React components
      reactbits/               # ReactBits-style UI components
      ui/                      # shadcn/Radix UI primitives
    hooks/                     # Shared React hooks
    lib/
      api.js                   # API client and auth storage
      socket.js                # Socket.io client helper
      utils.js                 # UI utilities
    pages/
      AdminDashboard.jsx
      ConfidentialBooking.jsx
      CounsellorDashboard.jsx
      Dashboard.jsx
      Index.jsx
      Login.jsx
      MyWellness.jsx
      PeerSupport.jsx
      Pricing.jsx
      ResourceHub.jsx
      Signup.jsx
      UserDashboard.jsx
      NotFound.jsx
    store/
      authSlice.js
      hooks.js
      index.js
    App.jsx                    # Frontend route map
    main.jsx                   # React app entrypoint
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

Copy `.env.example` to `.env` in the project root.

```bash
cp .env.example .env
```

For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Required values:

```env
VITE_API_BASE_URL=http://localhost:5001
PORT=5001
CLIENT_ORIGIN=http://localhost:8080
MONGODB_URI=mongodb://127.0.0.1:27017/mindsupport
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
GOOGLE_MEET_DEFAULT_LINK=
```

### 3. Start MongoDB

Make sure MongoDB is running locally or update `MONGODB_URI` to your MongoDB connection string.

### 4. Start frontend and backend

```bash
npm run dev:full
```

Frontend:

```text
http://localhost:8080
```

Backend API:

```text
http://localhost:5001
```

Health check:

```text
GET http://localhost:5001/api/health
```

## Create Admin Manually

Admin accounts are not created from signup. Use:

```bash
npm run create:admin -- owner@example.com strong-password "Owner Name"
```

Or with environment variables:

```bash
ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD=strong-password ADMIN_NAME="Owner Name" npm run create:admin
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start Vite frontend only |
| `npm run dev:api` | Start Express API with Node watch mode |
| `npm run dev:full` | Start frontend and backend together |
| `npm run server` | Start backend server |
| `npm run start` | Start backend server |
| `npm run create:admin` | Create or update an admin account |
| `npm run build` | Build production frontend |
| `npm run preview` | Preview production frontend |
| `npm run lint` | Run ESLint |

## Frontend Routes

| Route | Access |
| --- | --- |
| `/` | Public home |
| `/login` | Public login |
| `/signup` | User and counsellor signup |
| `/dashboard` | Role-based dashboard redirect |
| `/user` | User only |
| `/counsellor` | Approved counsellor only |
| `/admin` | Admin only |
| `/book` | User and admin |
| `/wellness` | User and admin |
| `/peer` | User and admin |
| `/resources` | Public resources |
| `/pricing` | Public pricing |

## API Highlights

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register user or counsellor |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET` | `/api/auth/me` | Current authenticated user |
| `POST` | `/api/auth/otp/request` | Request OTP |
| `POST` | `/api/auth/otp/verify` | Verify OTP |
| `GET` | `/api/user/dashboard` | User dashboard data |
| `GET` | `/api/counsellor/dashboard` | Counsellor dashboard data |
| `GET` | `/api/admin/dashboard` | Admin dashboard data |
| `GET` | `/api/counsellor-applications/me` | Current counsellor application |
| `POST` | `/api/counsellor-applications` | Submit counsellor verification request |
| `GET` | `/api/admin/counsellor-applications` | List counsellor applications |
| `PATCH` | `/api/admin/counsellor-applications/:id` | Approve or reject counsellor |
| `GET` | `/api/counsellors` | Browse counsellors |
| `POST` | `/api/appointments` | Book a session |
| `PUT` | `/api/appointments/:id` | Update session status |
| `POST` | `/api/meet/create` | Create or open Google Meet session |
| `POST` | `/api/messages` | Send secure message |
| `POST` | `/api/journals` | Save journal entry |
| `POST` | `/api/payments/session` | Record payment |
| `POST` | `/api/reviews` | Add counsellor review |
| `PATCH` | `/api/admin/reviews/:id` | Moderate review |
| `GET` | `/api/resources` | List resources |
| `POST` | `/api/wellness/mood` | Save mood entry |
| `POST` | `/api/wellness/assessment` | Save wellness assessment |
| `POST` | `/api/wellness/emergency` | Trigger emergency support record |

## Google Meet

Set `GOOGLE_MEET_DEFAULT_LINK` if you want all online sessions to use a fixed institutional Meet room.

If it is empty, the app uses:

```text
https://meet.google.com/new
```

That lets a signed-in counsellor create or start a new Meet session.

## Safety Notice

MindSupport is for emotional support, counselling workflows, wellness tracking, and educational mental health resources. It does not replace medical, psychiatric, or emergency care. For immediate danger or crisis situations, users should contact local emergency services or a crisis helpline.

## Quality Checks

Run these before deployment:

```bash
npm run lint
npm run build
```

The app is expected to run with MongoDB connected and a strong `JWT_SECRET` configured.
