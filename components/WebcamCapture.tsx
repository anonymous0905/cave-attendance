"use client";
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";

export default function WebcamCapture({ onCapture }: { onCapture: (img: string) => void }) {
    const webcamRef = useRef<Webcam>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const [spoofDetected, setSpoofDetected] = useState(false);
    const [heartRate, setHeartRate] = useState<number | null>(null);

    // Basic Discrete Fourier Transform to estimate heart rate from intensity samples
    const computeBpm = (samples: number[], fps: number): number | null => {
        const N = samples.length;
        if (N === 0) return null;
        const mean = samples.reduce((a, b) => a + b, 0) / N;
        const centered = samples.map(v => v - mean);
        const re = new Array(N).fill(0);
        const im = new Array(N).fill(0);
        for (let k = 0; k < N; k++) {
            for (let n = 0; n < N; n++) {
                const angle = (-2 * Math.PI * k * n) / N;
                re[k] += centered[n] * Math.cos(angle);
                im[k] += centered[n] * Math.sin(angle);
            }
        }
        let bestFreq = 0;
        let bestMag = 0;
        for (let k = 1; k < N / 2; k++) {
            const freq = (k * fps) / N;
            if (freq < 0.8 || freq > 3.0) continue; // ~48-180 bpm
            const mag = Math.hypot(re[k], im[k]);
            if (mag > bestMag) {
                bestMag = mag;
                bestFreq = freq;
            }
        }
        if (bestFreq === 0) return null;
        return Math.round(bestFreq * 60);
    };

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

    // Heart rate detection using rPPG
    useEffect(() => {
        const video = webcamRef.current?.video as HTMLVideoElement | undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const FaceDetectorCtor = (window as any).FaceDetector as
            | (new (opts?: { fastMode?: boolean }) => { detect: (input: CanvasImageSource) => Promise<{ boundingBox: DOMRectReadOnly }[]> })
            | undefined;
        if (!video || !FaceDetectorCtor) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new FaceDetectorCtor({ fastMode: true } as any);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const overlay = overlayRef.current;
        const overlayCtx = overlay?.getContext("2d");
        const buffer: number[] = [];
        const fps = 30; // approximate frame rate
        let frame = 0;
        let raf: number;

        const loop = async () => {
            if (!video || video.readyState !== 4 || !ctx) {
                raf = requestAnimationFrame(loop);
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            if (overlay && overlayCtx) {
                overlay.width = video.videoWidth;
                overlay.height = video.videoHeight;
                overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
            }

            try {
                const faces = await detector.detect(video);
                if (faces.length > 0) {
                    const box = faces[0].boundingBox;
                    const x = box.x + box.width * 0.3;
                    const y = box.y + box.height * 0.1;
                    const w = box.width * 0.4;
                    const h = box.height * 0.15;
                    if (overlayCtx) {
                        overlayCtx.strokeStyle = "red";
                        overlayCtx.lineWidth = 2;
                        overlayCtx.strokeRect(box.x, box.y, box.width, box.height);
                        overlayCtx.strokeStyle = "lime";
                        overlayCtx.strokeRect(x, y, w, h);
                    }
                    const data = ctx.getImageData(x, y, w, h).data;
                    let sum = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        sum += data[i + 1]; // green channel
                    }
                    const mean = sum / (data.length / 4);
                    buffer.push(mean);
                    if (buffer.length > 300) buffer.shift();
                    frame++;
                    if (frame % 30 === 0 && buffer.length > 150) {
                        const bpm = computeBpm(buffer.slice(-150), fps);
                        if (bpm) setHeartRate(bpm);
                    }
                }
            } catch {
                // ignore detection errors
            }

            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const capture = () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            onCapture(imageSrc);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="rounded-lg shadow"
                    videoConstraints={{ facingMode: "user" }}
                />
                <canvas
                    ref={overlayRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
            </div>
            <button
                onClick={capture}
                disabled={spoofDetected || heartRate === null}
                className={`mt-2 px-4 py-2 bg-blue-600 text-white rounded ${
                    spoofDetected || heartRate === null ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
                Capture Photo
            </button>
            {heartRate === null && (
                <p className="text-yellow-400 text-sm mt-1 text-center">Detecting heart rate...</p>
            )}
            {heartRate !== null && (
                <p className="text-green-400 text-sm mt-1 text-center">Heart Rate: {heartRate} bpm</p>
            )}
            {spoofDetected && (
                <p className="text-red-600 text-sm mt-1 text-center">
                    No movement detected. Please ensure you are not using a static photo.
                </p>
            )}
        </div>
    );
}
