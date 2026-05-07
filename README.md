# ⚡ StockPulse

> **SEBI-compliant stock market analyst platform for Indian markets**
> Angular 17 · NestJS · MySQL 8 · Socket.IO · Razorpay · Ionic + Capacitor

A social-financial platform where SEBI-registered analysts publish stock calls, manage paid subscription plans, and engage with retail investors. Includes full technical & fundamental analysis, real-time price streaming, an admin moderation dashboard, and cross-platform mobile apps.

---

## 📦 What's Inside

```
stockpulse/
├── database/              MySQL 8 schema + seed SQL
├── backend/               NestJS REST API + Socket.IO gateway
├── frontend/              Angular 17 web app (PWA-ready)
├── mobile/                Ionic + Capacitor iOS/Android app
└── docker-compose.yml     One-command local dev environment
```

## 🛠 Tech Stack

| Layer          | Technology                                                  |
|----------------|-------------------------------------------------------------|
| Web Frontend   | Angular 17 (standalone components) · NgRx · Material · ApexCharts |
| Mobile         | Ionic 7 · Capacitor 5 · Angular (shares code with web)     |
| Backend        | Node.js 20 · NestJS 10 · TypeScript · TypeORM · Passport JWT |
| Database       | MySQL 8 (InnoDB, utf8mb4) · Redis (cache + rate limit)     |
| Realtime       | Socket.IO 4 (JWT-auth, rooms for tickers/analysts/admins)  |
| Payments       | Razorpay (UPI/cards/netbanking, with 18% GST auto-calc)    |
| Market Data    | Upstox/Zerodha Kite WebSocket (live) · Alpha Vantage (EOD) |
| Hosting        | Vercel (web) · Railway→AWS ECS (API) · AWS RDS (MySQL)     |

## ✨ Features

- **Social feed** with `⚡ Daily Call`, `📈 Swing Trade`, `🏛 Long-Term` tip types
- **SEBI verification flow** — gated plan creation until admin approves reg number
- **Paid subscription plans** — Razorpay with signature verification + GST
- **Premium tip masking** — non-subscribers see ticker + type but not levels
- **Crowd targets** — aggregates community sentiment + avg target per ticker
- **Analyst profile** — overall accuracy + free-tip accuracy + by-type breakdown
- **Technical analysis** — server-side SMA/EMA/RSI/MACD/Bollinger/ATR on OHLCV history
- **Fundamental analysis** — P/E, ROE, shareholding, quarterly results
- **Real-time updates** — new tips, price changes, subscription events
- **Admin dashboard** — KPI overview, SEBI queue, user moderation, plan control
- **Non-SEBI disclaimer** — auto-appended on independent analyst content

## 🔐 Business Rules (enforced in backend)

1. **Two roles only** — `user` and `admin`. All analysts are users.
2. **Paid plans** require `sebi === true && sebiVerified === true && status === 'active'`
   (enforced via `SebiVerifiedGuard` + `user.canOfferPlan` getter)
3. **Premium tip access** — checked in `TipsService.maskIfLocked()` — requires active subscription
4. **SEBI queue** — every SEBI submission must be admin-approved before verification
5. **Non-SEBI disclaimer** — auto-appended to posts from non-verified users
6. **Crowd confidence** — `MIN(95, 40 + n×8 + IF(n>3, 10, 0))` where n = distinct analyst calls

---

## 🚀 Quick Start (Docker — recommended)

```bash
git clone <this-repo>
cd stockpulse

docker-compose up -d

# Wait ~30s for MySQL to finish init, then seed:
docker exec -it stockpulse-api npm run seed

# Open in browser:
# Web:     http://localhost:4200
# API:     http://localhost:3000/api
# Swagger: http://localhost:3000/api/docs
```

## 🔧 Manual Setup (without Docker)

### Prerequisites

- Node.js 20+
- MySQL 8
- Redis 7 (optional, for caching)

### 1. Database

```bash
mysql -u root -p < database/schema.sql
# Creates `stockpulse` database, tables, views, and seed data
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DB_PASSWORD, JWT_ACCESS_SECRET, RAZORPAY_KEY_*

npm install
npm run seed              # Populates demo users, stocks, tips, OHLCV
npm run start:dev         # http://localhost:3000
```

### 3. Frontend (Web)

```bash
cd ../frontend
npm install
npm start                 # http://localhost:4200
```

### 4. Mobile (optional)

```bash
cd ../mobile
npm install
ionic cap add android
ionic cap add ios
ionic cap run android     # or ios
```

---

## 👥 Demo Credentials

All passwords: **`password123`**

| Email                   | Role  | SEBI State          |
|-------------------------|-------|---------------------|
| `admin@stockpulse.in`   | admin | N/A                 |
| `arjun@stockpulse.in`   | user  | ✓ Verified          |
| `priya@stockpulse.in`   | user  | ✓ Verified          |
| `rohan@stockpulse.in`   | user  | ✓ Verified          |
| `sneha@stockpulse.in`   | user  | Pending             |
| `vikram@stockpulse.in`  | user  | Independent (no reg)|
| `rahul@stockpulse.in`   | user  | Retail subscriber   |

---

## 📡 Key API Endpoints

Full Swagger UI at `http://localhost:3000/api/docs`

```
POST   /api/v1/auth/register              Create account
POST   /api/v1/auth/login                 Email + password → JWT pair
POST   /api/v1/auth/refresh               Rotate access token
GET    /api/v1/auth/me                    Current user

GET    /api/v1/tips/feed                  Paginated feed (subscription-aware masking)
POST   /api/v1/tips                       Publish a new tip
GET    /api/v1/tips/crowd-targets         Aggregated community sentiment
GET    /api/v1/tips/analyst/:id/stats     Accuracy breakdown
PATCH  /api/v1/tips/:id/close             Resolve tip (owner only)

POST   /api/v1/plans                      Create plan (SEBI-verified only)
GET    /api/v1/plans                      All active plans
POST   /api/v1/subscriptions              Subscribe to a plan

GET    /api/v1/analysis/:ticker           Full analysis bundle
GET    /api/v1/analysis/:ticker/technical SMA/EMA/RSI/MACD/Bollinger
GET    /api/v1/analysis/:ticker/fundamental  P/E, ROE, shareholding, quarterly

PATCH  /api/v1/users/me/sebi              Submit SEBI reg for verification

GET    /api/v1/admin/overview             Platform KPIs (admin only)
GET    /api/v1/admin/sebi-queue           Pending SEBI verifications
POST   /api/v1/admin/sebi/:id/approve     Approve SEBI registration
POST   /api/v1/admin/users/:id/suspend    Suspend user
```

## 📬 WebSocket Events (Socket.IO namespace `/realtime`)

**Client → Server**
- `watch:ticker` — subscribe to price updates for a ticker
- `watch:analyst` — subscribe to an analyst's new tips
- `unwatch:ticker` — unsubscribe

**Server → Client**
- `feed:new-tip` — broadcast when any tip is published
- `ticker:new-tip` — tip for a watched ticker
- `analyst:new-tip` — tip from a watched analyst
- `price:update` — `{ ticker, price, change }` when a watched ticker moves
- `subscription:new` — new subscriber notification (for analysts)

All connections require a JWT access token in `auth.token`.

---

## 🏗 Architecture Highlights

### Backend

```
src/
├── auth/          JWT + refresh tokens, Passport strategies
├── users/         Profile, SEBI submission, leaderboard
├── tips/          Create/feed/close + crowd aggregation + analyst stats
├── posts/         Social feed posts + likes
├── plans/         SEBI-gated plan creation (guard-enforced)
├── subscriptions/ Subscribe/cancel with Razorpay lifecycle
├── analysis/      Technical indicators computed server-side + fundamentals
├── admin/         User/SEBI queue/plan moderation
├── market-data/   Cron jobs for live price simulation + EOD sync
├── payments/      Razorpay order creation + HMAC-SHA256 verification
├── realtime/      Socket.IO gateway with JWT auth
├── watchlist/     Personal watchlist
└── notifications/ In-app notifications
```

### Frontend

```
src/app/
├── core/
│   ├── services/   AuthService, TipsService, PlansService, AnalysisService, ...
│   ├── guards/     authGuard, adminGuard, guestGuard
│   ├── interceptors/  authInterceptor, errorInterceptor (auto token refresh)
│   └── models/     TypeScript interfaces matching backend entities
├── features/
│   ├── auth/       Login, Register (signal-based forms)
│   ├── feed/       Composer + tip feed (with realtime new-tip push)
│   ├── analysis/   Technical + Fundamental tabs, ApexCharts
│   ├── analysts/   Plan grid + Analyst profile (3 tabs)
│   ├── leaderboard/ Top analysts by accuracy
│   ├── watchlist/  Personal stock tracker
│   ├── profile/    SEBI submission + plan launch
│   └── admin/      4-tab dashboard (Overview/Users/SEBI/Plans)
└── shared/
    └── components/shell.component.ts   Collapsible sidebar + topbar
```

---

## 🔒 Security

- **JWT rotation** — 15-min access tokens + 7-day hashed refresh tokens (SHA-256 before storage)
- **bcrypt** password hashing (10 rounds)
- **Rate limiting** — `@nestjs/throttler` 100 req/min/IP globally
- **Helmet** HTTP security headers
- **CORS** locked to configured origins
- **ValidationPipe** — whitelist + forbidNonWhitelisted + transform
- **SQL injection** — TypeORM parameterized queries everywhere
- **Razorpay HMAC-SHA256** signature verification before marking payment paid
- **Audit log** — all SEBI approvals, user suspensions, plan deactivations tracked

---

## 📈 Scaling Notes

- `stock_prices` table is **partitioned by KEY(ticker)** into 8 partitions for fast range scans
- `tips` has composite indexes on `(ticker, tip_type, is_paid)` and `(user_id, created_at)`
- `v_crowd_targets` view materializes community aggregation — cache in Redis with 60s TTL
- WebSocket gateway uses Socket.IO rooms (`user:$id`, `ticker:$ticker`, `analyst:$id`, `admins`) for O(1) broadcast targeting
- Market data ingestion runs as separate cron worker — in prod, swap to a dedicated Node service reading Kafka/Kinesis
- Horizontal scaling: API instances behind an ALB, shared Redis for rate limiting + Socket.IO adapter

---

## 🧪 Testing

```bash
# Backend
cd backend
npm test                  # unit
npm run test:e2e          # integration

# Frontend
cd frontend
ng test                   # Karma/Jasmine
```

---

## 📜 SEBI Compliance Notes

Under SEBI (Research Analysts) Regulations, 2014:

- Only persons registered as Research Analysts can offer **paid research/recommendations**
- Non-registered users may share personal views but **must carry a disclaimer** — the platform auto-appends this
- Registered analysts must disclose their reg number visibly — the platform renders the `✓ SEBI` chip + reg no
- All recommendations + outcomes are logged in the `audit_log` table for regulatory inquiry

This platform enforces these as **hard code gates** (not just UI hints) — `SebiVerifiedGuard` rejects plan creation and premium tip posting at the API layer regardless of client state.

---

## 📄 License

Proprietary — all rights reserved.

## 👤 Support

For platform support: `support@stockpulse.in`
For SEBI compliance queries: `compliance@stockpulse.in`
