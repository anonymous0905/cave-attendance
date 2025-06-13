"use client";
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";

export default function WebcamCapture({ onCapture }: { onCapture: (img: string) => void }) {
    const webcamRef = useRef<Webcam>(null);
    const [spoofDetected, setSpoofDetected] = useState(false);

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

    const capture = () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            onCapture(imageSrc);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="rounded-lg shadow"
                videoConstraints={{ facingMode: "user" }}
            />
            <button
                onClick={capture}
                disabled={spoofDetected}
                className={`mt-2 px-4 py-2 bg-blue-600 text-white rounded ${
                    spoofDetected ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
                Capture Photo
            </button>
            {spoofDetected && (
                <p className="text-red-600 text-sm mt-1 text-center">
                    No movement detected. Please ensure you are not using a static photo.
                </p>
            )}
        </div>
    );
}
