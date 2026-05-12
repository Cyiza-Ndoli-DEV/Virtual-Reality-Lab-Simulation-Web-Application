import Link from "next/link";
import { Atom, FlaskConical, GraduationCap, LogIn, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-cyan-50">
      <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blue-200/35 blur-3xl" />

      <header className="relative z-10 border-b border-sky-100/80 bg-white/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25">
              <Atom className="h-5 w-5" aria-hidden />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-slate-900">
                VRSPS
              </p>
              <p className="text-xs text-slate-500">Virtual Reality Science Practicals</p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-700 hover:to-cyan-700 hover:shadow-blue-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/80 px-4 py-1.5 text-xs font-medium text-sky-800 shadow-sm backdrop-blur-sm sm:text-sm">
            <Sparkles className="h-3.5 w-3.5 text-cyan-600" aria-hidden />
            Web portal for the VR Science Practical System
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-tight">
            Learn science practically—
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {" "}
              in immersive VR
            </span>
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600 sm:text-xl">
            Manage users, track experiments, and connect your Meta Quest experience
            to the classroom. Sign in to open your admin, teacher, or student
            dashboard.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:to-cyan-700 sm:w-auto"
            >
              <LogIn className="h-5 w-5" aria-hidden />
              Go to login
            </Link>
            <p className="max-w-xs text-center text-sm text-slate-500 sm:text-left">
              Use the account your administrator created, or the demo users from
              the project seed.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-4xl gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-sky-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition hover:border-sky-200 hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <GraduationCap className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Students</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Prepare for practicals, take quizzes, and submit experiment reports.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition hover:border-sky-200 hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
              <FlaskConical className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Teachers</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Follow progress, review sessions, and give feedback on reports.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition hover:border-sky-200 hover:shadow-md sm:col-span-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Atom className="h-6 w-6" aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Admins</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Manage users and keep the system ready for your school or program.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
