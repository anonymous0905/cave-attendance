'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SideNav() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="h-screen w-48 bg-gray-800 text-white p-4 flex flex-col gap-4">
      <Link href="/dashboard" className="hover:text-orange-300">Dashboard</Link>
      <Link href="/verify" className="hover:text-orange-300">Verify Records</Link>
      <Link href="/register" className="hover:text-orange-300">Register Intern</Link>
      <button onClick={handleLogout} className="mt-auto text-left hover:text-orange-300">
        Logout
      </button>
    </nav>
  )
}
