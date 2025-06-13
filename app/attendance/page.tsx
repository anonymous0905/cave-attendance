'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import logo from '@/public/cave-logo1.png'
import nav from '@/public/nav-logo.png'

interface Student {
  srn: string
  name: string
  lab?: string | null
}

interface DayAttendance {
  date: string
  present: boolean
  login?: string
  logout?: string
}

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState<Student | null>(null)
  const [week, setWeek] = useState<DayAttendance[]>([])
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data, error } = await supabase.from('students').select('srn, name, lab')
      if (!error && data) setStudents(data)
    })()
  }, [router])

  const fetchAttendance = async (student: Student) => {
    setSelected(student)
    const now = new Date()
    const sunday = new Date(now)
    sunday.setDate(now.getDate() - now.getDay())
    sunday.setHours(0,0,0,0)
    const saturday = new Date(sunday)
    saturday.setDate(sunday.getDate() + 6)
    saturday.setHours(23,59,59,999)

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('mode, timestamp')
      .eq('srn', student.srn)
      .gte('timestamp', sunday.toISOString())
      .lte('timestamp', saturday.toISOString())
      .order('timestamp', { ascending: true })

    const days: DayAttendance[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      days.push({ date: d.toISOString().split('T')[0], present: false })
    }

    if (!error && data) {
      const byDate: Record<string, { login?: string; logout?: string }> = {}
      data.forEach(log => {
        const dt = new Date(log.timestamp)
        const key = dt.toISOString().split('T')[0]
        const entry = byDate[key] || {}
        if (log.mode === 'login') {
          if (!entry.login || dt.toISOString() < entry.login) entry.login = dt.toISOString()
        } else if (log.mode === 'logout') {
          if (!entry.logout || dt.toISOString() > entry.logout) entry.logout = dt.toISOString()
        }
        byDate[key] = entry
      })
      days.forEach(day => {
        const entry = byDate[day.date]
        if (entry?.login && entry?.logout) {
          const diff = new Date(entry.logout).valueOf() - new Date(entry.login).valueOf()
          if (diff >= 7.5 * 60 * 60 * 1000) {
            day.present = true
          }
          day.login = new Date(entry.login).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
          day.logout = new Date(entry.logout).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
        }
      })
    }
    setWeek(days)
  }

  return (
    <>
      <Image src={nav} alt="nav" width={250} height={900} className="fixed bottom-0 left-0 z-40 pointer-events-none" />
      <div className="flex min-h-screen text-white bg-[#1a1a1a]">
        <aside className="w-64 bg-black p-6 flex flex-col justify-between fixed top-0 left-0 h-full z-30">
          <div>
            <Image src={logo} alt="Logo" width={200} height={200} className="mb-8" />
            <nav className="space-y-4 text-xl">
              <button onClick={() => router.push('/dashboard')} className="text-left w-full">Dashboard</button>
              <button onClick={() => router.push('/register')} className="text-left w-full">New Registration</button>
              <button onClick={() => router.push('/verify')} className="text-left w-full">Verify Records</button>
              <button onClick={() => router.push('/attendance')} className="text-left w-full bg-gray-200 text-black rounded px-1 py-1">View Attendance</button>
              <button onClick={() => router.push('/myaccount')} className="text-left w-full">My Account</button>
            </nav>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} className="text-left text-lg mt-10">Logout</button>
          </div>
        </aside>

        <main className="flex-1 p-10 ml-64">
          <h2 className="text-3xl font-bold mb-6">Intern Attendance</h2>
          <section className="bg-[#2a2a2a] p-6 rounded-2xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left bg-[#3a3a3a]">
                  <th className="p-2">SRN</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Lab</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map(st => (
                  <tr key={st.srn} className="border-b border-gray-700">
                    <td className="p-2">{st.srn}</td>
                    <td className="p-2">{st.name}</td>
                    <td className="p-2">{st.lab || '-'}</td>
                    <td className="p-2">
                      <button onClick={() => fetchAttendance(st)} className="text-blue-300 underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {selected && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded w-11/12 max-w-xl text-black">
                <div className="flex justify-between mb-4">
                  <h3 className="text-xl font-semibold">{selected.name} ({selected.srn})</h3>
                  <button onClick={() => { setSelected(null); setWeek([]); }} className="text-black text-2xl">&times;</button>
                </div>
                <table className="min-w-full text-sm mb-4">
                  <thead>
                    <tr className="text-left bg-gray-200">
                      <th className="p-2">Date</th>
                      <th className="p-2">Login</th>
                      <th className="p-2">Logout</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.map(day => (
                      <tr key={day.date} className="border-b">
                        <td className="p-2">{day.date}</td>
                        <td className="p-2">{day.login || '-'}</td>
                        <td className="p-2">{day.logout || '-'}</td>
                        <td className="p-2">{day.present ? 'Present' : 'Absent'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
