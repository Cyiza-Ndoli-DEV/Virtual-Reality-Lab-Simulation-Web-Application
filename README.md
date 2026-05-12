# VRSPS Web Portal

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-5-2D3748) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38BDF8) ![Status](https://img.shields.io/badge/Status-In%20Development-orange)

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
| PostgreSQL | v14+ | [postgresql.org](https://www.postgresql.org/download/) |
| PGAdmin | v7+ | [pgadmin.org](https://www.pgadmin.org/download/) |
| Git | Latest | [git-scm.com](https://git-scm.com) |

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/CYIIZA.........../vrsps-web.git
cd vrsps-web
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

Open **PGAdmin** and create a new database:

- Right-click **Databases** → **Create** → **Database**
- Name it: `vrsps_db`
- Click **Save**

### 4. Configure environment variables

Create a `.env` file in the root of the project:

```env
DATABASE_URL="postgresql://postgres:YOURPASSWORD@localhost:5432/vrsps_db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
UNITY_API_KEY="your-unity-api-key-here"
```

Replace:
- `YOURPASSWORD` — your PostgreSQL password set during installation
- `NEXTAUTH_SECRET` — any random string (used to encrypt sessions)
- `UNITY_API_KEY` — any random string (shared with the Unity VR app)

### 5. Run database migrations

This creates all the required tables in your database:

```bash
npx prisma migrate dev --name init
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
├── .env                     # Environment variables (not committed)
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

---

## 🔌 Unity API Endpoints

These endpoints are called by the Unity VR application. All require the `X-API-KEY` header.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/unity/student/:id` | Verify student exists |
| `POST` | `/api/unity/session/start` | Start an experiment session |
| `POST` | `/api/unity/session/end` | End session with results |
| `POST` | `/api/unity/session/wrong-step` | Log a wrong step |

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
| PostgreSQL | Database |
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
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:pass@localhost:5432/vrsps_db` |
| `NEXTAUTH_SECRET` | Secret for encrypting sessions | Any random string |
| `NEXTAUTH_URL` | Base URL of the app | `http://localhost:3000` |
| `UNITY_API_KEY` | API key shared with Unity app | Any random string |

---

## 📄 License

This project is developed for academic and educational purposes as part of a final year project at a Ugandan university.

---

*Built for Ugandan students — every student deserves a laboratory experience. 🇺🇬*
