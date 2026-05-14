# MindSupport

MindSupport is a JavaScript-only, MongoDB-only mental wellness and counselling platform. It includes public counsellor discovery, role-based dashboards, counsellor verification, session scheduling, Google Meet support, WhatsApp-style secure chat, wellness tracking, resource articles/videos, notifications, payments, reviews, emergency support, and admin moderation.

The project does not use TypeScript, Supabase, Gemini, or AI APIs. Lovable branding has also been removed. The browser favicon now matches the MindSupport navbar logo.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript, React, React Router |
| State | Redux Toolkit, React Query |
| Styling | Tailwind CSS, shadcn/ui, Radix UI, Lucide icons, ReactBits-style UI |
| Backend | Node.js, Express |
| Database | MongoDB Atlas or local MongoDB with Mongoose |
| Auth | JWT bearer tokens, bcrypt password hashing, OTP verification routes |
| Real-time | Socket.io |
| Charts | Recharts |
| Video Sessions | Shared Google Meet link flow |
| Resources | MongoDB articles plus backend YouTube Data API proxy |

## Current Features

- Public home page with hero, counsellor showcase, platform benefits, booking flow, session modes, stories, FAQ, and CTA.
- Branded MindSupport favicon and metadata.
- User and counsellor signup only. Admin accounts are created manually.
- Counsellor signup creates a pending counsellor account with verification details.
- Pending counsellors cannot access the counsellor dashboard until admin approval.
- Admin dashboard for user management, counsellor approvals, session monitoring, revenue, reports, analytics, notifications, reviews, and emergency alerts.
- User dashboard for sessions, wellness, journal, self-care, chat, payments, privacy settings, username settings, and emergency support.
- Counsellor dashboard for appointments, availability management, patient details, session notes, chat, reviews, earnings, notifications, privacy/settings, and Google Meet sessions.
- Counselling marketplace with professional profile cards, search/filter, one-time support package pricing, detailed profile pages, and separate session schedule page.
- Session booking supports Google Meet, voice call, and in-person modes.
- Users can chat only with counsellors they have booked.
- Chat includes reply, edit, delete, reactions, attachments, and notification support.
- Resource hub supports videos and article cards with thumbnails/fallback covers.
- Emergency keyword handling and SOS records notify relevant roles.
- MongoDB seed data creates useful launch data for Render and Atlas deployments.

## Role Flow

### User

Users create a normal account, log in, book counsellors, schedule sessions, chat with booked counsellors, track wellness, write journals, browse resources, manage payments, and use emergency support.

### Counsellor

Counsellors choose the counsellor account type during signup. The form collects profile and verification information:

- Full name, username, email, phone, and password
- Counsellor type: verified professional or community mentor
- Bio, specialization, experience, languages, location, pricing
- Consultation modes and availability
- Profile photo URL, certificates, LinkedIn/portfolio
- ID details, license number, education/training, references
- Approach and emergency training notes

After signup:

```text
role = counsellor
status = pending
verificationStatus = pending
```

The admin must approve the application before the counsellor dashboard unlocks.

### Admin

Admins are created manually from backend scripts or seed environment variables. There is no public admin signup. Admins approve/reject counsellors, manage users, monitor sessions, handle revenue, moderate reviews, send announcements, and review emergency activity.

## Project Structure

```text
mindSupport-main/
  .env.example                 # Root env reference for frontend and backend
  index.html                   # Vite HTML entry and app metadata
  package.json                 # Scripts and dependencies
  vite.config.js               # Vite config, React plugin, /api proxy
  tailwind.config.js           # Tailwind design system
  public/
    favicon.svg                # MindSupport navbar-matching favicon
    robots.txt

  backend/
    server.js                  # Small Node entrypoint
    .env.example               # Backend-only env reference
    scripts/
      create-admin.js          # Manual admin creation
      seed-resources.js        # Resource seed runner
      seed-counsellors.js      # Approved counsellor seed runner
      seed-all.js              # Full MongoDB launch-data seed
    src/
      app.js                   # Express app, middleware, helpers, static dist serving
      config/env.js            # Environment config
      database/connect.js      # MongoDB connection
      database/seed.js         # Idempotent collection and seed data
      models/index.js          # Mongoose schemas and models
      realtime/socket.js       # Socket.io JWT auth and rooms
      routes/
        index.js               # Route registration
        auth.routes.js
        applications.routes.js
        user.routes.js
        counsellor.routes.js
        admin.routes.js
        marketplace.routes.js
        communication.routes.js
        notifications.routes.js
        resources.routes.js
        peer.routes.js
        wellness.routes.js
        analytics.routes.js

  src/
    assets/                    # Frontend image imports
    components/                # Shared React components
    components/reactbits/      # ReactBits-style UI components
    components/ui/             # shadcn/Radix primitives
    hooks/                     # Shared hooks
    lib/api.js                 # API client and auth storage
    lib/socket.js              # Socket.io client helper
    pages/
      AdminDashboard.jsx
      Counselling.jsx
      CounsellorDashboard.jsx
      Dashboard.jsx
      Index.jsx
      Login.jsx
      MyWellness.jsx
      PeerSupport.jsx
      ResourceHub.jsx
      SessionSchedule.jsx
      Signup.jsx
      UserDashboard.jsx
      NotFound.jsx
    store/                     # Redux Toolkit store and auth slice
    App.jsx                    # Route map
    main.jsx                   # React entrypoint
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

Copy the root env example:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Minimum local values:

```env
VITE_API_BASE_URL=http://localhost:5001
PORT=5001
CLIENT_ORIGIN=http://localhost:8080
MONGODB_URI=mongodb://127.0.0.1:27017/mindsupport
MONGODB_DATABASE=mindsupport
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_NAME=MindSupport Admin
GOOGLE_MEET_DEFAULT_LINK=
YOUTUBE_API_KEY=
```

For MongoDB Atlas:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=mindsupport
```

Never commit real passwords, Atlas credentials, JWT secrets, or API keys.

### 3. Run frontend and backend

```bash
npm run dev:full
```

Frontend:

```text
http://localhost:8080
```

Backend:

```text
http://localhost:5001
```

Health check:

```text
GET http://localhost:5001/api/health
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start Vite frontend only |
| `npm run dev:api` | Start Express backend with Node watch mode |
| `npm run dev:full` | Run frontend and backend together |
| `npm run build` | Build production frontend into `dist/` |
| `npm run server` | Start Express backend |
| `npm run start` | Start Express backend |
| `npm run preview` | Preview production frontend |
| `npm run lint` | Run ESLint |
| `npm run create:admin` | Create or update an admin account |
| `npm run seed:resources` | Seed resources |
| `npm run seed:counsellors` | Seed approved counsellors |
| `npm run seed:all` | Create collections and seed launch data |

## Admin Creation

Admin accounts are manual only.

```bash
npm run create:admin -- owner@example.com strong-password "Owner Name"
```

Or with environment variables:

```bash
ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD=strong-password ADMIN_NAME="Owner Name" npm run create:admin
```

PowerShell:

```powershell
$env:ADMIN_EMAIL="owner@example.com"; $env:ADMIN_PASSWORD="strong-password"; $env:ADMIN_NAME="Owner Name"; npm run create:admin
```

## Seed Data

The seed creates a full launch database in MongoDB:

- users
- counsellor applications
- approved counsellors
- appointments
- resources with thumbnails
- journals
- mood entries
- assessments
- messages
- payments
- notifications
- reviews
- peer posts/comments/reports
- OTP records

Run:

```bash
npm run seed:all
```

To seed an admin at the same time, set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` before running `seed:all`.

## Frontend Routes

| Route | Access |
| --- | --- |
| `/` | Public home |
| `/login` | Public login |
| `/signup` | Public user/counsellor signup |
| `/resources` | Public resource hub |
| `/counselling` | Public counsellor marketplace |
| `/counselling/:counsellorId` | Public profile view, login needed for protected booking data |
| `/session-schedule` | User only |
| `/dashboard` | Protected role redirect |
| `/user` | User only |
| `/counsellor` | Approved counsellor only |
| `/admin` | Admin only |
| `/wellness` | User and admin |
| `/peer` | User and admin |
| `*` | Not found |

## API Highlights

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register user or counsellor |
| `POST` | `/api/auth/login` | Login with email or username |
| `GET` | `/api/auth/me` | Current authenticated user |
| `POST` | `/api/auth/otp/request` | Request OTP |
| `POST` | `/api/auth/otp/verify` | Verify OTP |
| `GET` | `/api/user/dashboard` | User dashboard data |
| `GET` | `/api/counsellor/dashboard` | Counsellor dashboard data |
| `GET` | `/api/admin/dashboard` | Admin dashboard data |
| `GET` | `/api/counsellors` | Browse counsellors |
| `GET` | `/api/counsellors/:id` | View counsellor profile |
| `POST` | `/api/appointments` | Book session package/date/time |
| `PUT` | `/api/appointments/:id` | Update appointment status |
| `POST` | `/api/meet/create` | Resolve/open shared Google Meet link |
| `POST` | `/api/messages` | Send chat message |
| `PATCH` | `/api/messages/:id` | Edit message |
| `DELETE` | `/api/messages/:id` | Delete message |
| `POST` | `/api/messages/:id/reactions` | React to message |
| `GET` | `/api/resources` | List platform resources |
| `GET` | `/api/resources/youtube` | Search YouTube videos through backend proxy |
| `POST` | `/api/wellness/mood` | Save mood entry |
| `POST` | `/api/wellness/assessment` | Save assessment |
| `POST` | `/api/wellness/emergency` | Trigger emergency record |

## Resource Hub

Resources include:

- YouTube wellness videos via backend proxy
- Motivation articles
- Stress and burnout guides
- Sleep hygiene resources
- Self-confidence articles
- Relationship, loneliness, recovery, and trauma support articles

Article cards render thumbnails when available and use generated fallback covers when not. Seeded resources include thumbnail data.

Set the backend-only `YOUTUBE_API_KEY` to enable live YouTube Data API results. If missing or failing, the backend returns curated fallback videos.

## Google Meet

Use a reusable Google Meet room for automatic user/counsellor connection:

```env
GOOGLE_MEET_DEFAULT_LINK=https://meet.google.com/abc-defg-hij
```

Do not save `https://meet.google.com/new` as the shared link. It creates a different room for each person. Counsellors can also save a reusable Meet link in dashboard settings or on a session.

## Render Deployment

This project can deploy as one Render Web Service because Express serves the built React `dist/` folder.

Recommended Render settings:

| Setting | Value |
| --- | --- |
| Service type | Web Service |
| Runtime | Node |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |

Render environment variables:

```env
NODE_ENV=production
PORT=10000
CLIENT_ORIGIN=https://your-render-service.onrender.com
VITE_API_BASE_URL=
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=mindsupport
JWT_SECRET=use-a-long-random-production-secret
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-strong-admin-password
ADMIN_NAME=MindSupport Admin
GOOGLE_MEET_DEFAULT_LINK=https://meet.google.com/abc-defg-hij
YOUTUBE_API_KEY=your-youtube-data-api-key
```

For a same-service Render deploy, leave `VITE_API_BASE_URL` empty so the React app calls the same origin with `/api/...`.

If frontend and backend are deployed separately, set:

```env
CLIENT_ORIGIN=https://your-frontend-domain.com
VITE_API_BASE_URL=https://your-backend-domain.com
```

After deployment, seed Atlas if needed:

```bash
npm run seed:all
```

## Quality Checks

Run before pushing or deploying:

```bash
npm run lint
npm run build
```

Current lint output may include existing Fast Refresh warnings from shared UI files and one `ResourceHub` hook dependency warning. There are no lint errors in the current build.

## Safety Notice

MindSupport provides emotional support, counselling workflows, wellness tracking, and educational mental health resources. It does not replace medical, psychiatric, or emergency care. For immediate danger, users should contact local emergency services or a crisis helpline.
