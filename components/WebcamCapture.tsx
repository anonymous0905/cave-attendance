"use client";
import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";

interface VitalLensConstructor {
    new (options: { method: string; apiKey?: string }): {
        setVideoStream(stream: MediaStream, video: HTMLVideoElement): Promise<void>;
        startVideoStream(): void;
        stopVideoStream(): void;
        addEventListener(event: string, cb: (data: unknown) => void): void;
    };
}

declare global {
    interface Window {
        VitalLens?: VitalLensConstructor;
    }
}

export default function WebcamCapture({ onCapture }: { onCapture: (img: string) => void }) {
    const webcamRef = useRef<Webcam>(null);
    const vitalRef = useRef<InstanceType<VitalLensConstructor> | null>(null);
    const [ready, setReady] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const setup = async () => {
            const stream = webcamRef.current?.stream;
            const video = webcamRef.current?.video;
            if (!stream || !video) return;

            if (!window.VitalLens) {
                await new Promise((resolve) => {
                    const script = document.createElement("script");
                    script.src = "https://cdn.jsdelivr.net/npm/vitallens/dist/vitallens.browser.js";
                    script.onload = resolve;
                    document.head.appendChild(script);
                });
            }

            const { VitalLens } = window as { VitalLens?: VitalLensConstructor };
            if (!VitalLens) return;
            const vl = new VitalLens({
                method: "vitallens",
                apiKey: process.env.NEXT_PUBLIC_VITALLENS_API_KEY,
            });
            vitalRef.current = vl;
            await vl.setVideoStream(stream, video);
            vl.addEventListener("vitals", (data: unknown) => {
                const res = data as { vital_signs?: { heart_rate?: { value?: number } } };
                const hr = res?.vital_signs?.heart_rate?.value;
                if (typeof hr === "number" && hr > 0) {
                    setReady(true);
                    vl.stopVideoStream();
                }
            });
            vl.startVideoStream();

            let count = 0;
            const interval = setInterval(() => {
                count++;
                setProgress((count / 50) * 100);
                if (count >= 50) {
                    clearInterval(interval);
                    vl.stopVideoStream();
                }
            }, 100);
        };

        if (webcamRef.current?.stream) {
            setup();
        } else {
            const checkInterval = setInterval(() => {
                if (webcamRef.current?.stream) {
                    clearInterval(checkInterval);
                    setup();
                }
            }, 200);
            return () => clearInterval(checkInterval);
        }
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
            <div className="w-full bg-gray-200 h-2 rounded mt-2">
                <div className="bg-blue-500 h-2 rounded" style={{ width: `${progress}%` }} />
            </div>
            <button
                onClick={capture}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                disabled={!ready}
            >
                Capture Photo
            </button>
        </div>
    );
}
