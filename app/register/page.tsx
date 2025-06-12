"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import WebcamCapture from "@/components/WebcamCapture";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const [imageData, setImageData] = useState<string | null>(null);
    const [form, setForm] = useState({ srn: "", name: "", email: "", lab: "" });
    const [status, setStatus] = useState("");

    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (!data?.user) router.push("/login"); // redirect if not logged in
        });
    }, [router]);

    const handleSubmit = async () => {
        setStatus("Uploading...");

        const { srn, name, email, lab } = form;

        if (!imageData || !srn || !name || !lab) {
            setStatus("Missing data");
            return;
        }

        // Convert base64 to blob
        const res = await fetch(imageData);
        const blob = await res.blob();

        // Upload to Supabase Storage
        const uploadPath = `photos/${srn}.jpg`;
        const { error: uploadError } = await supabase.storage
            .from("reference-photos")
            .upload(uploadPath, blob, { upsert: true });

        if (uploadError) {
            setStatus("Failed to upload image");
            return;
        }

        const { data: publicURLData } = supabase.storage
            .from("reference-photos")
            .getPublicUrl(uploadPath);

        const { error: insertError } = await supabase.from("students").insert([
            {
                srn,
                name,
                email,
                lab,
                reference_image_url: publicURLData.publicUrl
            }
        ]);

        if (insertError) {
            setStatus("Failed to insert student record");
        } else {
            setStatus("Student registered successfully!");
            setForm({ srn: "", name: "", email: "", lab: "" });
            setImageData(null);
        }
    };

    return (
        <div className="max-w-xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Register Intern</h1>

            <input
                placeholder="SRN"
                value={form.srn}
                onChange={(e) => setForm({ ...form, srn: e.target.value })}
                className="w-full p-2 mb-2 border rounded"
            />
            <input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-2 mb-2 border rounded"
            />
            <input
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-2 mb-2 border rounded"
            />
            <input
                placeholder="Lab"
                value={form.lab}
                onChange={(e) => setForm({ ...form, lab: e.target.value })}
                className="w-full p-2 mb-4 border rounded"
            />

            {!imageData && <WebcamCapture onCapture={setImageData} />}
            {imageData && (
                <img src={imageData} alt="Captured" className="w-40 h-40 rounded shadow mb-4" />
            )}

            <button
                onClick={handleSubmit}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
                Submit
            </button>

            {status && <p className="mt-2 text-sm text-gray-600">{status}</p>}
        </div>
    );
}
