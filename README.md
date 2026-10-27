# 🎉 Holiday Hangout Planner

> Built for **API Blitz 2026** — *Three APIs. One product. One database. One winner.*  
> Organized by the **Microsoft Student Technical Club (MSTC)**, Dhirubhai Ambani University (DAU).

Holiday Hangout Planner turns public holidays into memorable experiences with friends. It connects national holiday calendars with activity recommendations and generates instant QR codes so hangout plans can be shared and scanned effortlessly.

---

## 🌟 The 3 Assigned APIs

| API | Role in Holiday Hangout Planner | Verified Endpoint / Method |
| :--- | :--- | :--- |
| **1. Nager.Date API** | Fetches global public holidays and metadata by country code and calendar year. | `GET https://date.nager.at/api/v3/PublicHolidays/{year}/{country}` |
| **2. Bored API** | Recommends curated hangout activities tailored by vibe/category and crew size. | `GET https://bored-api.appbrewery.com/random` & `/filter` (proxied server-side via `/api/activity` to bypass CORS) |
| **3. goQR API** | Dynamically creates high-resolution QR codes that encode the shareable hangout invitation URL. | `GET https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={url}` |

---

## 🗄️ Database Integration: Neon Serverless PostgreSQL

As required by the **API Blitz Rulebook**, this application integrates with **Neon Serverless PostgreSQL** to store and retrieve generated hangout plans:

- **Schema Table:** `holiday_plans` (defined in `db/schema.sql`).
- **Auto-Initialization:** The server automatically checks and provisions the PostgreSQL table upon startup with proper indexes.
- **Persistent Community Wall:** Saved hangouts are fetched from Neon and showcased in the "Community Hangout Inspiration" section.
- **Resilient Fallback Mode:** If `DATABASE_URL` is omitted, the app operates gracefully in **Neon-Ready In-Memory Mode**, using an in-memory store and URL-encoded query parameters so judges can test immediately without any mandatory setup barrier.
- **Live Status & Evidence:** Click the **Neon DB** pill in the top header (or visit `/api/db/status`) to view real-time connection status and database diagnostics.

### Connecting Your Neon Database:
1. Create a free project at [neon.tech](https://neon.tech).
2. Copy your connection string (`postgresql://username:password@ep-xyz.neon.tech/neondb?sslmode=require`).
3. Set `DATABASE_URL` in your `.env` file:
   ```env
   DATABASE_URL=postgresql://username:password@ep-xyz.neon.tech/neondb?sslmode=require
   ```
4. Restart the server (`npm start`). The header badge will switch to **Neon DB (Active)**.

---

## 🚀 Core User Flow

1. **Select Country & Year:** Choose a featured or global country (e.g., India, US, UK, Canada, Australia) and event year (2026/2025/2027).
2. **Browse Public Holidays:** The app queries Nager.Date API and displays the full calendar of public holidays with badges and dates.
3. **Plan My Day:** Select any holiday and click "Plan my day with Bored API."
4. **Generate Hangout Activity:** Bored API suggests an activity (e.g. *Host a game night*, *Explore a local park*). Customize category (Social, Recreational, Music, Cooking), specify group size, or hit **🎲 Re-roll Activity** for fresh suggestions.
5. **Generate QR & Share:** The app saves the hangout plan to Neon PostgreSQL and calls goQR API to generate a QR code.
6. **Scan & RSVP:** Friends scan the QR code with their mobile phone cameras to open the dedicated invitation page and click **"Count Me In! 🎊"**.

---

## 💻 Local Setup & Run Instructions

### Prerequisites
- **Node.js** (v18.0.0 or later; tested on v24.15.0)
- **npm** (v9.0.0 or later)

### Quick Start (Under 1 Minute)

1. **Navigate to the project directory:**
   ```bash
   cd "API Blitz"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```
   *(Optional)* Paste your Neon PostgreSQL connection string in `.env`. If left empty, the server defaults to the built-in in-memory fallback.

4. **Start the application:**
   ```bash
   npm start
   ```

5. **Open in browser:**
   ```
   http://localhost:3000
   ```

---

## 🛠️ Architecture & Project Structure

```
API Blitz/
├── .env.example            # Environment template with Neon DATABASE_URL
├── .gitignore              # Ignored files (node_modules, .env, logs)
├── package.json            # Node.js configuration & dependencies
├── README.md               # Documentation, API guide, and instructions
├── server.js               # Express server, proxy routes, fallback activities, and API endpoints
├── db/
│   ├── index.js            # Neon PostgreSQL connection pool & resilient in-memory fallback store
│   └── schema.sql          # SQL schema definition for holiday_plans table
└── public/
    ├── index.html          # Responsive single-page application UI (Dark MSTC aesthetic)
    ├── style.css           # Modern CSS (glassmorphism cards, responsive flex/grid, micro-animations)
    ├── app.js              # Client logic (API calls, QR generator, deep linking, modal dialogs)
    └── favicon.svg         # SVG icon
```

---

## 🌐 API Endpoints Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/countries` | `GET` | Returns supported countries (cached in-memory). |
| `/api/holidays?country=XX&year=YYYY` | `GET` | Fetches public holidays for country `XX` and `year` via Nager.Date API. |
| `/api/activity?type=...&participants=...` | `GET` | Fetches activity ideas from Bored API (safe server-side proxy prevents CORS issues). |
| `/api/qr?data=...&size=250x250` | `GET` | Proxies or formats goQR API QR code generation. |
| `/api/plans` | `POST` | Persists a holiday hangout plan into Neon PostgreSQL. |
| `/api/plans/:id` | `GET` | Retrieves a stored hangout plan by its unique ID. |
| `/api/plans` | `GET` | Retrieves recent plans for the Community Inspiration Wall. |
| `/api/db/status` | `GET` | Diagnostics endpoint reporting Neon PostgreSQL connection status. |
| `/api/health` | `GET` | Health check endpoint returning uptime, timestamp, and DB status. |

---

## ☁️ Deployment Guide

The application is structured as a self-contained Node.js Express service, making it ready to deploy on any cloud platform:

- **Render / Railway / Fly.io:**
  - Build command: `npm install`
  - Start command: `npm start`
  - Set environment variable `DATABASE_URL` with your Neon PostgreSQL connection string.
- **Vercel:**
  - Can be deployed with standard Node.js runtime configuration.

---

## 🛡️ Error Handling & Reliability Measures

1. **CORS Mitigation:** The Bored API (`bored-api.appbrewery.com`) does not supply client-side CORS headers. By routing activity requests through the Express backend `/api/activity`, browser CORS blocks are completely eliminated.
2. **Network Resilience & Fallbacks:** If external APIs experience downtime or timeouts, the backend utilizes curated fallback activities and national calendars so the user experience never breaks during live judging.
3. **Dual Deep-Link Support:** Shared links support both database IDs (`?planId=...`) and URL query parameters (`?c=...&h=...&d=...&a=...`), ensuring invitation links work even across disconnected environments.
4. **Input Sanitization:** URL parameters and text inputs are safely encoded and sanitized to prevent XSS.

---

## 📜 Event Compliance & Submission Checklist

- [x] **Three Assigned APIs:** Nager.Date API, Bored API, and goQR API are all integrated meaningfully.
- [x] **Unassigned APIs Excluded:** Pantry API and QuickChart API are not used in this build.
- [x] **Database Requirement:** Full Neon PostgreSQL schema, connection pooling, and UI diagnostic badge implemented.
- [x] **Core User Flow:** Complete flow from country selection -> holiday choice -> activity generation -> QR sharing -> scanning/RSVP verified.
- [x] **Local Run Tested:** Starts with `npm start` on `http://localhost:3000`.
- [x] **README Included:** Complete setup, running, deployment, and integration documentation provided.
