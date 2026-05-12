'use client'

import { useEffect, useState } from 'react'
import { Users, FlaskConical, AlertTriangle, TrendingUp } from 'lucide-react'

interface Stats {
  totalStudents: number
  totalTeachers: number
  totalSessions: number
  avgWrongSteps: number
  passRate: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
  }, [])

  const cards = stats ? [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Teachers', value: stats.totalTeachers, icon: Users, color: 'bg-green-50 text-green-600' },
    { label: 'VR Sessions', value: stats.totalSessions, icon: FlaskConical, color: 'bg-purple-50 text-purple-600' },
    { label: 'Avg Wrong Steps', value: stats.avgWrongSteps, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
    { label: 'Pass Rate', value: `${stats.passRate}%`, icon: TrendingUp, color: 'bg-teal-50 text-teal-600' },
  ] : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of the VRSPS system</p>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading stats...</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className={`inline-flex p-2.5 rounded-xl ${card.color} mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-sm text-slate-500 mt-1">{card.label}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}