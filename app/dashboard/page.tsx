'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import Image from 'next/image'
import logo from '@/public/cave-logo1.png'
import nav from '@/public/nav-logo.png'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

interface Log {
  id: string
  srn: string
  mode: string
  timestamp: string
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [name, setName] = useState('')
  const router = useRouter()

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setName(user.user_metadata?.name ?? user.email ?? '')

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6) // include today

      const { data, error } = await supabase
          .from('attendance_logs')
          .select('id, srn, mode, timestamp')
          .gte('timestamp', sevenDaysAgo.toISOString())
          .order('timestamp', { ascending: true })

      if (!error && data) {
        setLogs(data)
      }
    })()
  }, [router])

  const loginLogs = logs.filter(log => log.mode === 'login')
  const recentLogins = loginLogs.slice(-10).reverse()

  // Initialize counts for the past 7 days
  const counts: Record<string, number> = {}
  const dateLabels: string[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const key = date.toISOString().split('T')[0]
    dateLabels.push(key)
    counts[key] = 0
  }

  loginLogs.forEach(log => {
    const key = new Date(log.timestamp).toISOString().split('T')[0]
    if (counts[key] !== undefined) {
      counts[key]++
    }
  })

  const chartData = {
    labels: dateLabels,
    datasets: [
      {
        label: 'Logins per Day',
        data: dateLabels.map(d => counts[d]),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        tension: 0.3,
      },
    ],
  }

  return (
      <>
        <Image src={nav} alt="nav" width={250} height={900} className="fixed bottom-0 left-0 z-40 pointer-events-none" />

        <div className="flex min-h-screen text-white bg-[#1a1a1a]">
          {/* Sidebar */}
          <aside className="w-64 bg-black p-6 flex flex-col justify-between fixed top-0 left-0 h-full z-30">
            <div>
              <Image src={logo} alt="Logo" width={200} height={200} className="mb-8" />
              <nav className="space-y-4 text-xl">
                <button onClick={() => router.push('/dashboard')} className="text-left w-full bg-gray-200 text-black rounded px-1 py-1">Dashboard</button>
                <button onClick={() => router.push('/register')} className="text-left w-full">New Registration</button>
                <button onClick={() => router.push('/verify')} className="text-left w-full">Verify Records</button>
                <button onClick={() => router.push('/attendance')} className="text-left w-full">View Attendance</button>
                <button onClick={() => router.push('/myaccount')} className="text-left w-full">My Account</button>
              </nav>
              <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} className="text-left text-lg mt-10">Logout</button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-10 ml-64 space-y-10">
            <p className="text-xl">Welcome, {name}</p>
            <h2 className="text-3xl font-bold">Attendance Dashboard</h2>

            {/* Recent Logins */}
            <section className="bg-[#2a2a2a] p-6 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4">Last 10 Logins</h3>
              <ul className="list-disc pl-5 text-sm text-gray-200 space-y-1">
                {recentLogins.map((log) => (
                    <li key={log.id}>
                      <span className="font-semibold text-white">{log.srn}</span> – {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </li>
                ))}
              </ul>
            </section>

            {/* Attendance Chart */}
            <section className="bg-[#3a3a3a] p-6 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4">Daily Attendance</h3>
              <div className="bg-white rounded-lg p-4">
                <Line data={chartData} />
              </div>
            </section>
          </main>
        </div>
      </>
  )
}
