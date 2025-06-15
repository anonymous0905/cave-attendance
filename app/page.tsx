'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import WebcamPhotoVideoCapture from '@/components/WebcamPhotoVideoCapture'
import vrDoctorsImg from '@/public/login-side.png'
import caveLogo from '@/public/cave-logo1.png'

export default function CapturePage() {
  const [srn, setSrn] = useState('')
  const [mode, setMode] = useState<'login' | 'logout'>('login')
  const [status, setStatus] = useState('')
  const [imageData, setImageData] = useState<string | null>(null)
  const [videoData, setVideoData] = useState<string | null>(null)

  const getLocation = () => {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation not supported')
      } else {
        navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              })
            },
            () => reject('Location access denied')
        )
      }
    })
  }

  const handleSubmit = async () => {
    setStatus('Submitting...')

    if (!srn || !imageData || !videoData) {
      setStatus('Please enter SRN and capture a photo and video')
      return
    }

    try {
      const coords = await getLocation()

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          srn,
          mode,
          latitude: coords.lat,
          longitude: coords.lng,
          imageBase64: imageData,
          videoBase64: videoData,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        setStatus(`Failed: ${errorText}`)
      } else {
        setStatus('Attendance submitted successfully.')
        setSrn('')
        setImageData(null)
        setVideoData(null)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setStatus('Error: ' + message)
    }
  }

  return (
      <div className="flex h-screen w-screen relative">
        <Link
            href="/login"
            className="absolute top-6 right-6 z-10 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Admin Login
        </Link>
        {/* Left Panel */}
        <div className="w-1/2 bg-black flex items-center justify-center relative">
          <div className="bg-white p-8 sm:p-10 lg:p-12 rounded-3xl shadow-xl w-full max-w-sm sm:max-w-md lg:max-w-lg">
            <h1 className="text-3xl font-bold text-black mb-6 text-center">Intern Attendance</h1>

            <input
                placeholder="Enter your SRN"
                value={srn}
                onChange={(e) => setSrn(e.target.value)}
                className="w-full rounded-md bg-gray-200 p-3 text-black placeholder:text-gray-500 focus:outline-none mb-4"
            />

            <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'login' | 'logout')}
                className="w-full rounded-md bg-gray-200 p-3 text-black mb-4"
            >
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>

            {!imageData && !videoData && (
                <WebcamPhotoVideoCapture
                    onCapture={(img, vid) => {
                        setImageData(img)
                        setVideoData(vid)
                    }}
                />
            )}
            {imageData && (
                <Image
                    src={imageData}
                    alt="Captured"
                    width={160}
                    height={160}
                    className="w-40 h-40 rounded shadow mb-4 mx-auto"
                />
            )}

            <button
                onClick={handleSubmit}
                className="w-full rounded-full bg-orange-300 text-black font-bold py-2 text-lg hover:opacity-90 transition"
            >
              Submit Attendance
            </button>

            {status && (
                <p className="text-xs text-center text-gray-600 mt-2">{status}</p>
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
