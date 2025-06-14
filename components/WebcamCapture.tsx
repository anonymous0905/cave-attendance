"use client";
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { fft, util as fftUtil } from "fft-js";

interface FaceDetectionResult {
    boundingBox: DOMRectReadOnly;
}

interface FaceDetector {
    detect(input: CanvasImageSource): Promise<FaceDetectionResult[]>;
}

export default function WebcamCapture({ onCapture }: { onCapture: (img: string) => void }) {
    const webcamRef = useRef<Webcam>(null);
    const [spoofDetected, setSpoofDetected] = useState(false);
    const [heartRate, setHeartRate] = useState<number | null>(null);
    const [captureEnabled, setCaptureEnabled] = useState(false);

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

    useEffect(() => {
        const video = webcamRef.current?.video as HTMLVideoElement | undefined;
        if (!video) return;

        const faceDetector: FaceDetector | null = ("FaceDetector" in window)
            ? new (window as unknown as { FaceDetector: new (opts?: { fastMode?: boolean }) => FaceDetector }).FaceDetector({ fastMode: true })
            : null;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const samples: { t: number; v: number }[] = [];
        const fps = 30;
        let raf: number;

        const process = async () => {
            if (!video || !ctx) {
                raf = requestAnimationFrame(process);
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            let roi: Uint8ClampedArray | null = null;
            if (faceDetector) {
                try {
                    const faces = await faceDetector.detect(video);
                    if (faces.length > 0) {
                        const box = faces[0].boundingBox;
                        const x = box.x + box.width * 0.25;
                        const y = box.y + box.height * 0.1;
                        const w = box.width * 0.5;
                        const h = box.height * 0.15;
                        roi = ctx.getImageData(x, y, w, h).data;
                    }
                } catch {
                    roi = null;
                }
            }

            if (!roi) {
                const w = canvas.width * 0.3;
                const h = canvas.height * 0.15;
                const x = (canvas.width - w) / 2;
                const y = canvas.height * 0.15;
                roi = ctx.getImageData(x, y, w, h).data;
            }

            let sum = 0;
            for (let i = 0; i < roi.length; i += 4) sum += roi[i + 1];
            const avg = sum / (roi.length / 4);
            const now = Date.now();
            samples.push({ t: now, v: avg });
            const cutoff = now - 10000;
            while (samples.length > 0 && samples[0].t < cutoff) samples.shift();

            if (samples.length >= fps * 5) {
                const values = samples.map((s) => s.v);
                const mean = values.reduce((a, b) => a + b, 0) / values.length;
                const centered = values.map((v) => v - mean);
                const phasors = fft(centered);
                const mags = fftUtil.fftMag(phasors);
                const freqs = fftUtil.fftFreq(phasors, fps);
                let bestFreq = 0;
                let bestMag = 0;
                for (let i = 1; i < freqs.length; i++) {
                    const f = freqs[i];
                    if (f >= 0.75 && f <= 3) {
                        if (mags[i] > bestMag) {
                            bestMag = mags[i];
                            bestFreq = f;
                        }
                    }
                }
                const bpm = bestFreq * 60;
                if (bpm > 40 && bpm < 180) {
                    setHeartRate(Math.round(bpm));
                    setCaptureEnabled(!spoofDetected);
                } else {
                    setHeartRate(null);
                    setCaptureEnabled(false);
                }
            } else {
                setHeartRate(null);
                setCaptureEnabled(false);
            }

            raf = requestAnimationFrame(process);
        };

        raf = requestAnimationFrame(process);
        return () => cancelAnimationFrame(raf);
    }, [spoofDetected]);

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
                disabled={!captureEnabled}
                className={`mt-2 px-4 py-2 bg-blue-600 text-white rounded ${
                    !captureEnabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
                Capture Photo
            </button>
            {spoofDetected && (
                <p className="text-red-600 text-sm mt-1 text-center">
                    No movement detected. Please ensure you are not using a static photo.
                </p>
            )}
            {heartRate && (
                <p className="text-green-500 text-sm mt-1 text-center">Heart Rate: {heartRate} BPM</p>
            )}
        </div>
    );
}
