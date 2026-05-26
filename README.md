# VRSPS Web Portal

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-5-2D3748) ![MySQL](https://img.shields.io/badge/MySQL-8-4479A1) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38BDF8) ![Status](https://img.shields.io/badge/Status-In%20Development-orange)

> Web management portal for the **Virtual Reality Science Practical System (VRSPS)** — a Meta Quest 3s VR application designed to provide immersive science practical learning for students in resource-limited schools across Uganda.

---

## 📋 Overview

This portal works alongside the Unity VR application. It provides:

- **Admin** — user management, system oversight, reports
- **Teacher** — student progress tracking, experiment reports, feedback
- **Student** — experiment preparation, quizzes, report writing, progress tracking
- **Unity API** — endpoints called directly by the VR app to log session data

---

## ⚙️ Prerequisites

Make sure you have the following installed before proceeding:

| Tool | Version | Download |
|---|---|---|
| Node.js | v20+ | [nodejs.org](https://nodejs.org) |
| npm | v9+ | Comes with Node.js |
| MySQL | v8+ | [dev.mysql.com/downloads](https://dev.mysql.com/downloads/mysql/) |
| Git | Latest | [git-scm.com](https://git-scm.com) |

Optional: [MySQL Workbench](https://dev.mysql.com/downloads/workbench/) or any MySQL client to create the database and run ad hoc queries.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/https://github.com/Cyiza-Ndoli-DEV/Virtual-Reality-Lab-Simulation-Web-Application.git
cd vrsps-web
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

Create an empty database (utf8mb4 recommended). From a MySQL client:

```sql
CREATE DATABASE vrsps_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or use your preferred GUI (Workbench, DBeaver, etc.) and create a schema named `vrsps_db`.

### 4. Configure environment variables

Copy the example file and edit values:

```bash
cp .env.example .env
```

On Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

`.env` should include:

```env
DATABASE_URL="mysql://root:YOURPASSWORD@localhost:3306/vrsps_db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
UNITY_API_KEY="your-unity-api-key-here"
```

Replace:

- `root` / `YOURPASSWORD` — your MySQL user and password (use a dedicated app user in production)
- `vrsps_db` — database name if you chose a different one
- `NEXTAUTH_SECRET` — any random string (used to encrypt sessions)
- `UNITY_API_KEY` — any random string (shared with the Unity VR app)

### 5. Run database migrations

This creates all the required tables in your database:

```bash
npx prisma migrate dev
```

For a new project, this applies the existing migrations in `prisma/migrations`. To record a new schema change after editing `schema.prisma`:

```bash
npx prisma migrate dev --name describe_your_change
```

### 6. Seed the database

This creates default users and sample experiments:

```bash
npm run seed
```

Default accounts created:

| Role | Email | Password |
|---|---|---|
| Admin | admin@vrsps.ug | Admin@1234 |
| Teacher | teacher@vrsps.ug | Teacher@1234 |
| Student | student@vrsps.ug | Student@1234 |

> ⚠️ Change these passwords immediately in a production environment.

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
vrsps-web/
├── prisma/
│   ├── schema.prisma        # Database models
│   ├── migrations/          # Applied SQL migrations (MySQL)
│   └── seed.ts              # Default data seeder
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/       # Login page
│   │   ├── admin/           # Admin dashboard & pages
│   │   ├── teacher/         # Teacher dashboard & pages
│   │   ├── student/         # Student dashboard & pages
│   │   └── api/
│   │       ├── auth/        # NextAuth handler
│   │       ├── admin/       # Admin API routes
│   │       └── unity/       # Unity VR API routes
│   ├── components/
│   │   └── ui/              # shadcn/ui components
│   ├── lib/
│   │   ├── auth.ts          # NextAuth configuration
│   │   ├── prisma.ts        # Prisma client
│   │   └── utils.ts         # Utility functions
│   ├── types/
│   │   └── next-auth.d.ts   # Session type extensions
│   └── middleware.ts        # Route protection by role
├── .env                     # Environment variables (not committed; copy from .env.example)
├── .env.example             # Example env (MySQL URL and app secrets)
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

---

## 🔌 Unity API Endpoints

These endpoints are called by the Unity VR application. All require the `X-API-KEY` header.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/unity/auth/login` | Student sign-in (email + password) |
| `GET` | `/api/unity/auth/session` | Validate VR access token |
| `GET` | `/api/unity/student/:id` | Verify student exists |
| `POST` | `/api/unity/session/start` | Start an experiment session |
| `POST` | `/api/unity/session/end` | End session with results |
| `POST` | `/api/unity/session/wrong-step` | Log a wrong step |

All Unity routes require the `X-API-KEY` header (shared secret embedded in the VR app).

**Example — Student login (VR headset):**
```http
POST /api/unity/auth/login
X-API-KEY: your-unity-api-key-here
Content-Type: application/json

{
  "email": "student@vrsps.ug",
  "password": "Student@1234",
  "apiKey": "vrsps-dev-unity-key-2026"
}
```

**Response:**
```json
{
  "student": {
    "id": "clx123abc",
    "name": "Jane Student",
    "email": "student@university.ac.ug"
  },
  "accessToken": "eyJ...signed-token",
  "expiresAt": "2026-05-27T12:00:00.000Z"
}
```

Send the API key as header `X-API-KEY` **or** JSON field `apiKey` (helpful if the VR client has trouble with custom headers). The value must match `UNITY_API_KEY` in `.env` — **save `.env` and restart `npm run dev`** after changing it.

Store `accessToken` on the device and send it as `Authorization: Bearer <accessToken>` when calling `GET /api/unity/auth/session` to confirm the student is still signed in. Use `student.id` as `studentId` for session start/end APIs.

**Example — Start Session:**
```http
POST /api/unity/session/start
X-API-KEY: your-unity-api-key-here
Content-Type: application/json

{
  "studentId": "clx123abc",
  "experimentId": "titration-001"
}
```

**Response:**
```json
{
  "sessionId": "clx456def",
  "message": "Session started successfully"
}
```

---

## 👥 User Roles & Access

| Role | Access |
|---|---|
| **Admin** | Full access — manage users, view all data, system reports |
| **Teacher** | View student sessions, give feedback on reports, view quiz scores |
| **Student** | Do experiments, take quizzes, write reports, view own progress |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Frontend + Backend framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | UI components |
| NextAuth.js v5 | Authentication & session management |
| Prisma 5 | Database ORM |
| MySQL 8 | Database |
| bcryptjs | Password hashing |
| Lucide React | Icons |

---

## 🤝 Contributing

1. Fork the repository
2. Create your branch: `git checkout -b ft-your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin ft-your-feature`
5. Open a Pull Request against `main`

---

## 🔒 Environment Variables Reference

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | MySQL connection string (Prisma) | `mysql://user:pass@localhost:3306/vrsps_db` |
| `NEXTAUTH_SECRET` | Secret for encrypting sessions | Any random string |
| `NEXTAUTH_URL` | Base URL of the app | `http://localhost:3000` |
| `UNITY_API_KEY` | API key shared with Unity app | Any random string |
| `UNITY_VR_TOKEN_TTL_SECONDS` | VR login token lifetime (optional) | `28800` (8 hours) |

---

## 📄 License

This project is developed for academic and educational purposes as part of a final year project at a Ugandan university.

---

*Built for Ugandan students — every student deserves a laboratory experience. 🇺🇬*
