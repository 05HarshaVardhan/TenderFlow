# TenderFlow

TenderFlow is a full-stack tender and bid management platform. It combines a React + Vite frontend with a Node.js + Express + MongoDB backend, and includes optional AI assistance for drafting, review, and evaluation.

## Key Capabilities
- Tender lifecycle management (draft, publish, close, award, cancel) with auto-close for expired tenders.
- Bid management with two-envelope documentation, EMD details, and status tracking.
- AI-assisted workflows (optional): tender draft generation, bid pre-submit review, bid analysis reports, and semantic search.
- Real-time messaging and notifications using Socket.IO.
- Document uploads via Cloudinary (tenders, bids, images).
- Role-based access with SUPER_ADMIN, COMPANY_ADMIN, TENDER_POSTER, BIDDER, and AUDITOR roles.
- Observability hooks via LaunchDarkly.

## Architecture
- Frontend: React 19, Vite, Tailwind CSS, Radix UI, React Query, React Router, Socket.IO client.
- Backend: Express 5, Mongoose, Socket.IO server, Cloudinary + Multer uploads, Mailjet email, Google GenAI.

## Project Structure
- `frontend/` React app (routes defined in `frontend/src/App.jsx`)
- `backend/` Express API + Socket.IO server
- `backend/src/models/` data models (Tender, Bid, Company, User, Message, Notification, Team)
- `backend/src/routes/` REST API routes
- `backend/src/services/` AI and utility services
- `backend/scripts/` one-off scripts (e.g., embedding backfill)

## Local Development
### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables
### Backend (`backend/.env`)
```bash
MONGODB_URI=
JWT_SECRET=
SUPER_ADMIN_SETUP_KEY=
FRONTEND_URL=http://localhost:5173
PORT=5000
NODE_ENV=development

# Cloudinary uploads
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (Mailjet)
MJ_APIKEY_PUBLIC=
MJ_APIKEY_PRIVATE=
EMAIL_FROM=
EMAIL_FROM_NAME=TenderFlow
EMAIL_TEST_TO=

# Optional email aliases (used if EMAIL_FROM is missing)
GMAIL_SENDER=
EMAIL_USER=
MAILJET_API_KEY=
MAILJET_API_SECRET=

# AI (Google GenAI)
GEMINI_API_KEY=
AI_MODEL=gemini-2.5-flash-lite
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSION=
MONGODB_VECTOR_INDEX=tender_embedding_index

# Jobs
TENDER_AUTO_CLOSE_INTERVAL_MS=60000

# Observability (LaunchDarkly)
LAUNCHDARKLY_SDK_KEY=
LAUNCHDARKLY_SERVICE_NAME=tenderflow-backend
LAUNCHDARKLY_SERVICE_VERSION=
LAUNCHDARKLY_ENVIRONMENT=development
LAUNCHDARKLY_OTLP_ENDPOINT=
LAUNCHDARKLY_BACKEND_URL=
```

### Frontend (`frontend/.env`)
```bash
VITE_API_BASE_URL=http://localhost:5000/api
VITE_LAUNCHDARKLY_OBSERVABILITY_PROJECT_ID=
VITE_LAUNCHDARKLY_OBSERVABILITY_ENVIRONMENT=development
VITE_LAUNCHDARKLY_OBSERVABILITY_SERVICE_NAME=tenderflow-frontend
VITE_LAUNCHDARKLY_OBSERVABILITY_SERVICE_VERSION=1.0.0
```

## API & Testing
- API examples and flows: `backend/API_TESTING_GUIDE.md`
- Node-based API test runner: `npm run test:api`
- Curl script: `backend/test-api-curl.sh`

## Docker & Deployment
- Backend Dockerfile: `backend/Dockerfile`
- Frontend Dockerfile: `frontend/Dockerfile`
- Nginx template for frontend: `frontend/nginx.conf.template`

## Media Placeholders
Use the sections below to drop in screenshots and videos. Suggested folders:
- `docs/screenshots/`
- `docs/videos/`

### Screenshots
#### Architecture / System Overview
<!-- TODO: Add architecture diagram screenshot -->
![Architecture Diagram](docs/screenshots/00-architecture.png)

#### Login / Registration
<!-- TODO: Add login and registration screenshot -->
![Login / Registration](docs/screenshots/01-login.png)

#### Dashboard
<!-- TODO: Add dashboard screenshot -->
![Dashboard](docs/screenshots/02-dashboard.png)

#### Browse Tenders
<!-- TODO: Add browse tenders screenshot -->
![Browse Tenders](docs/screenshots/03-browse-tenders.png)

#### Tender Details
<!-- TODO: Add tender details screenshot -->
![Tender Details](docs/screenshots/04-tender-details.png)

#### Tender Evaluation (AI Report)
<!-- TODO: Add tender evaluation screenshot -->
![Tender Evaluation](docs/screenshots/05-tender-evaluation.png)

#### My Bids
<!-- TODO: Add my bids screenshot -->
![My Bids](docs/screenshots/06-my-bids.png)

#### Messages
<!-- TODO: Add messages screenshot -->
![Messages](docs/screenshots/07-messages.png)

#### Notifications
<!-- TODO: Add notifications screenshot -->
![Notifications](docs/screenshots/08-notifications.png)

#### Public Company Profile
<!-- TODO: Add company profile screenshot -->
![Company Profile](docs/screenshots/09-company-profile.png)

#### Settings
<!-- TODO: Add settings screenshot -->
![Settings](docs/screenshots/10-settings.png)

#### Developer Panel
<!-- TODO: Add developer panel screenshot -->
![Developer Panel](docs/screenshots/11-developer-panel.png)

### Videos
#### Full Walkthrough
<!-- TODO: Add full walkthrough video -->
[Watch: Full Walkthrough](docs/videos/overview.mp4)

#### Tender Flow Demo
<!-- TODO: Add tender flow demo video -->
[Watch: Tender Flow Demo](docs/videos/tender-flow.mp4)

#### Bid Submission Demo
<!-- TODO: Add bid submission demo video -->
[Watch: Bid Submission Demo](docs/videos/bid-submission.mp4)
