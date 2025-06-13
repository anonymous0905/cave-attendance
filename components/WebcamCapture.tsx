"use client";
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { analyzeLiveness } from "@/lib/rppg";

export default function WebcamCapture({ onCapture }: { onCapture: (img: string) => void }) {
    const webcamRef = useRef<Webcam>(null);
    const [ready, setReady] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const video = webcamRef.current?.video as HTMLVideoElement | undefined;
        if (!video) return;
        analyzeLiveness(video, setProgress).then((ok) => setReady(ok));
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
            {!ready && (
                <div className="w-full bg-gray-200 rounded h-2 mt-2">
                    <div
                        className="bg-blue-600 h-2 rounded"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                </div>
            )}
            <button
                onClick={capture}
                disabled={!ready}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
                Capture Photo
            </button>
        </div>
    );
}
