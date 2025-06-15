"use client";
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";

export default function WebcamPhotoVideoCapture({ onCapture }: { onCapture: (img: string, video: string) => void }) {
    const webcamRef = useRef<Webcam>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [spoofDetected, setSpoofDetected] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        let prevData: Uint8ClampedArray | null = null;
        let staticCount = 0;

        const checkInterval = setInterval(() => {
            const video = webcamRef.current?.video;
            if (!video || video.readyState !== 4 || !ctx) return;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            if (prevData) {
                let diff = 0;
                for (let i = 0; i < data.length; i += 4) {
                    diff += Math.abs(data[i] - prevData[i]);
                    diff += Math.abs(data[i + 1] - prevData[i + 1]);
                    diff += Math.abs(data[i + 2] - prevData[i + 2]);
                }
                const avgDiff = diff / (data.length / 4);
                if (avgDiff < 5) {
                    staticCount += 1;
                } else {
                    staticCount = 0;
                }
                if (staticCount >= 3) {
                    setSpoofDetected(true);
                } else {
                    setSpoofDetected(false);
                }
            }
            prevData = new Uint8ClampedArray(data);
        }, 700);

        return () => clearInterval(checkInterval);
    }, []);

    const startCapture = () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        const stream = webcamRef.current?.stream;
        if (!imageSrc || !stream) return;

        chunksRef.current = [];
        mediaRecorderRef.current = new MediaRecorder(stream, {
            mimeType: "video/webm;codecs=vp9",
            videoBitsPerSecond: 2500000,
        });
        mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: "video/webm" });
            const reader = new FileReader();
            reader.onloadend = () => {
                const videoBase64 = reader.result as string;
                onCapture(imageSrc, videoBase64);
                setCapturing(false);
                setProgress(0);
            };
            reader.readAsDataURL(blob);
        };

        mediaRecorderRef.current.start();
        setCapturing(true);
        setProgress(0);
        let elapsed = 0;
        const interval = setInterval(() => {
            elapsed += 1;
            setProgress((elapsed / 10) * 100);
            if (elapsed >= 10) {
                clearInterval(interval);
                mediaRecorderRef.current?.stop();
            }
        }, 1000);
    };

    return (
        <div className="flex flex-col items-center">
            <Webcam
                ref={webcamRef}
                audio
                screenshotFormat="image/jpeg"
                screenshotQuality={1}
                className="rounded-lg shadow"
                videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
            />
            {capturing && (
                <div className="w-full bg-gray-200 rounded h-2 mt-2">
                    <div className="bg-blue-600 h-2 rounded" style={{ width: `${progress}%` }} />
                </div>
            )}
            <button
                onClick={startCapture}
                disabled={spoofDetected || capturing}
                className={`mt-2 px-4 py-2 bg-blue-600 text-white rounded ${
                    spoofDetected || capturing ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
                Capture
            </button>
            {spoofDetected && (
                <p className="text-red-600 text-sm mt-1 text-center">
                    No movement detected. Please ensure you are not using a static photo.
                </p>
            )}
        </div>
    );
}
