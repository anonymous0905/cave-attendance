"use client";
import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";

export default function WebcamCapture({ onCapture }: { onCapture: (img: string) => void }) {
    const webcamRef = useRef<Webcam>(null);
    const [heartbeatDetected, setHeartbeatDetected] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/vitallens/dist/vitallens.browser.js";
        script.async = true;

        const detectHeartbeat = async () => {
            const video = webcamRef.current?.video as HTMLVideoElement | null;
            const stream = video?.srcObject as MediaStream | null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const globalObj = window as any;
            if (!stream || !globalObj.VitalLens) {
                setChecking(false);
                return;
            }

            interface VitalLensLike {
                processVideoFile(file: Blob): Promise<unknown>;
            }

            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: "video/webm" });
                const vl = new globalObj.VitalLens({ method: "chrom" }) as unknown as VitalLensLike;
                interface VitalLensResult { vital_signs?: { heart_rate?: { value?: number } } }
                const result = await vl.processVideoFile(blob) as VitalLensResult;
                const hr = result.vital_signs?.heart_rate?.value;
                setHeartbeatDetected(!!hr && hr > 0);
                setChecking(false);
            };
            recorder.start();
            setTimeout(() => recorder.stop(), 3000);
        };

        script.onload = () => { void detectHeartbeat(); };
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
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
                disabled={!heartbeatDetected}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
                Capture Photo
            </button>
            {!heartbeatDetected && !checking && (
                <p className="text-red-500 text-sm mt-2">No heartbeat detected</p>
            )}
        </div>
    );
}
