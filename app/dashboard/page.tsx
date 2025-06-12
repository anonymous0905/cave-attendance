'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SideNav from '@/components/SideNav'
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

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

interface Log {
  id: string
  srn: string
  mode: string
  created_at: string
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) router.push('/login')
    })

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('id, srn, mode, created_at')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        setLogs(data)
      }
    }

    fetchLogs()
  }, [router])

  const recentLogins = logs.filter((l) => l.mode === 'login').slice(0, 10)
  const counts: Record<string, number> = {}
  logs.forEach((l) => {
    if (l.mode === 'login' && l.created_at) {
      const date = l.created_at.split('T')[0]
      counts[date] = (counts[date] ?? 0) + 1
    }
  })
  const labels = Object.keys(counts).sort()
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Logins',
        data: labels.map((d) => counts[d]),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
      },
    ],
  }

  return (
    <div className="flex">
      <SideNav />
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Last 10 Logins</h2>
          <ul className="list-disc pl-5">
            {recentLogins.map((log) => (
              <li key={log.id}>
                {log.srn} - {new Date(log.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Daily Attendance</h2>
          <Line data={chartData} />
        </div>
      </div>
    </div>
  )
}
