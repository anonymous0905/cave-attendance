"use client";

import { useState } from "react";
import WebcamCapture from "@/components/WebcamCapture";

export default function CapturePage() {
  const [srn, setSrn] = useState("");
  const [mode, setMode] = useState<"login" | "logout">("login");
  const [status, setStatus] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const getLocation = () => {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Geolocation not supported");
      } else {
        navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            (err) => reject("Location access denied")
        );
      }
    });
  };

  const handleSubmit = async () => {
    setStatus("Submitting...");

    if (!srn || !imageData) {
      setStatus("Please enter SRN and capture a photo");
      return;
    }

    try {
      const coords = await getLocation();
      setLocation(coords);

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          srn,
          mode,
          latitude: coords.lat,
          longitude: coords.lng,
          imageBase64: imageData,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        setStatus(`Failed: ${errorText}`);
      } else {
        setStatus("Attendance submitted successfully.");
        setSrn("");
        setImageData(null);
      }
    } catch (err: any) {
      setStatus("Error: " + err);
    }
  };

  return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Intern Login / Logout</h1>

        <input
            placeholder="Enter your SRN"
            value={srn}
            onChange={(e) => setSrn(e.target.value)}
            className="w-full p-2 mb-4 border rounded"
        />

        <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "login" | "logout")}
            className="w-full p-2 mb-4 border rounded"
        >
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>

        {!imageData && <WebcamCapture onCapture={setImageData} />}
        {imageData && (
            <img src={imageData} alt="Captured" className="w-40 h-40 rounded shadow mb-4" />
        )}

        <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Submit Attendance
        </button>

        {status && <p className="mt-4 text-gray-700">{status}</p>}
      </div>
  );
}
