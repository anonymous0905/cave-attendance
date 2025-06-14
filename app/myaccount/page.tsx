'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import logo from '@/public/cave-logo1.png'
import nav from '@/public/nav-logo.png'

export default function MyAccountPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [status, setStatus] = useState('')
  const router = useRouter()

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email ?? '')
      setName(user.user_metadata?.name ?? '')
    })()
  }, [router])

  const handleSave = async () => {
    setStatus('')
    const { error } = await supabase.auth.updateUser({ data: { name } })
    if (error) {
      setStatus(error.message)
    } else {
      setStatus('Profile updated')
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword) return
    setStatus('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setStatus(error.message)
    } else {
      setStatus('Password updated')
      setNewPassword('')
    }
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
              <button onClick={() => router.push('/attendance')} className="text-left w-full">View Attendance</button>
              <button onClick={() => router.push('/myaccount')} className="text-left w-full bg-gray-200 text-black rounded px-1 py-1">My Account</button>
            </nav>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} className="text-left text-lg mt-10">Logout</button>
          </div>
        </aside>

        <main className="flex-1 p-10 ml-64 space-y-6">
          <h2 className="text-3xl font-bold mb-6">My Account</h2>
          <div className="bg-[#2a2a2a] p-6 rounded-2xl max-w-xl space-y-4">
            <p>Email: {email}</p>
            <label className="block">
              <span className="block mb-1">Name</span>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full p-2 rounded bg-white text-black" />
            </label>
            <button onClick={handleSave} className="bg-green-600 text-white py-2 px-4 rounded w-full">Save</button>
            <div className="border-t border-gray-600 pt-4">
              <label className="block mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 mb-2 rounded bg-white text-black" />
              <button onClick={handleChangePassword} className="bg-blue-600 text-white py-2 px-4 rounded w-full">Change Password</button>
            </div>
            {status && <p className="text-sm text-gray-300 mt-2">{status}</p>}
          </div>
        </main>
      </div>
    </>
  )
}
