"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import WebcamCapture from "@/components/WebcamCapture";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
    const [imageData, setImageData] = useState<string | null>(null);
    const [form, setForm] = useState({ srn: "", name: "", email: "", lab: "" });
    const [status, setStatus] = useState("");

    const router = useRouter();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (!data?.user) router.push("/login");
        });
    }, [router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setImageData(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        setStatus("Submitting...");

        const { srn, name, email, lab } = form;

        if (!imageData || !srn || !name || !lab) {
            setStatus("Missing data");
            return;
        }

        const token = (await supabase.auth.getSession()).data.session?.access_token;

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-intern`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ srn, name, email, lab, imageData })
        });

        const result = await response.json();

        if (!response.ok) {
            setStatus(`Failed: ${result.error || "Unknown error"}`);
            return;
        }

        setStatus("Intern registered successfully!");
        setForm({ srn: "", name: "", email: "", lab: "" });
        setImageData(null);
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

            {!imageData && (
                <>
                    <WebcamCapture onCapture={setImageData} />
                    <p className="text-center my-2">OR</p>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full mb-4" />
                </>
            )}
            {imageData && (
                <Image src={imageData} alt="Preview" width={160} height={160} className="w-40 h-40 rounded shadow mb-4" />
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
