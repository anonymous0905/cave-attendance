'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import vrDoctorsImg from '@/public/login-side.png'
import caveLogo from '@/public/cave-logo1.png'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()

    useEffect(() => {
        (async () => {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (user && !error) {
                router.push('/dashboard')
            }
        })()
    }, [router])

    const handleLogin = async () => {
        setError('')
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
        } else {
            router.push('/register')
        }
    }

    return (
        <div className="flex h-screen w-screen">
            {/* Left Panel */}
            <div className="w-1/2 bg-black flex items-center justify-center relative">
                <div className="bg-white p-8 sm:p-10 lg:p-12 rounded-3xl shadow-xl w-full max-w-sm sm:max-w-md lg:max-w-lg">
                    <h1 className="text-3xl font-bold text-black mb-6 text-center">Admin Sign in</h1>

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md bg-gray-200 p-3 text-black placeholder:text-gray-500 focus:outline-none mb-4"
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md bg-gray-200 p-3 text-black placeholder:text-gray-500 focus:outline-none mb-4"
                    />

                    <button
                        onClick={handleLogin}
                        className="w-full rounded-full bg-orange-300 text-black font-bold py-2 text-lg hover:opacity-90 transition"
                    >
                        Sign In
                    </button>

                    {error && (
                        <p className="text-xs text-center text-red-600 mt-2">{error}</p>
                    )}
                </div>

                <div className="absolute top-6 left-6 flex items-center text-white font-bold text-2xl tracking-wide">
                    <Image src={caveLogo} alt="Logo" width={200} height={200} className="mr-2" />
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-1/2 relative bg-black pointer-events-none">
                <Image
                    src={vrDoctorsImg}
                    alt="Doctors using VR"
                    layout="fill"
                    objectFit="cover"
                    className="rounded-l-none"
                />
            </div>
        </div>
    )
}
