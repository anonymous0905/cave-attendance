"use client";
import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";

export default function WebcamCapture({ onCapture }: { onCapture: (img: string) => void }) {
    const webcamRef = useRef<Webcam>(null);
    const [spoofDetected, setSpoofDetected] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [faceBox, setFaceBox] = useState<faceapi.Box | null>(null);
    const [foreheadBox, setForeheadBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [showBoxes, setShowBoxes] = useState(true);

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            setModelsLoaded(true);
        };
        loadModels();
    }, []);

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
        if (!modelsLoaded) return;

        const detectInterval = setInterval(async () => {
            const video = webcamRef.current?.video as HTMLVideoElement | undefined;
            if (!video || video.readyState !== 4) return;

            const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
            if (detection) {
                const box = detection.box;
                setFaceBox(box);
                setForeheadBox({
                    x: box.x,
                    y: box.y,
                    width: box.width,
                    height: box.height * 0.25,
                });
            } else {
                setFaceBox(null);
                setForeheadBox(null);
            }
        }, 500);

        return () => clearInterval(detectInterval);
    }, [modelsLoaded]);

    const capture = () => {
        setShowBoxes(false);
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            onCapture(imageSrc);
        }
        setShowBoxes(true);
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
                {showBoxes && faceBox && (
                    <div
                        className="absolute border-2 border-red-500"
                        style={{ left: faceBox.x, top: faceBox.y, width: faceBox.width, height: faceBox.height }}
                    />
                )}
                {showBoxes && foreheadBox && (
                    <div
                        className="absolute border-2 border-black"
                        style={{ left: foreheadBox.x, top: foreheadBox.y, width: foreheadBox.width, height: foreheadBox.height }}
                    />
                )}
            </div>
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
