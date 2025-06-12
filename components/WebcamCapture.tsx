"use client";
import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

export default function WebcamCapture({ onCapture }: { onCapture: (img: string) => void }) {
    const webcamRef = useRef<Webcam>(null);
    const [captured, setCaptured] = useState(false);

    const capture = () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            onCapture(imageSrc);
            setCaptured(true);
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
            <button onClick={capture} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">
                Capture Photo
            </button>
        </div>
    );
}
