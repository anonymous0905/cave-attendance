"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import WebcamCapture from "@/components/WebcamCapture";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/public/cave-logo1.png";
import nav from "@/public/nav-logo.png";

export default function RegisterPage() {
    const [imageData, setImageData] = useState<string | null>(null);
    const [form, setForm] = useState({ srn: "", name: "", email: "", lab: "" });
    const labs = ["CAVE Labs", "ISFCR", "MARS", "C-IoT"];
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
        <>
            <Image src={nav} alt="nav" width={250} height={900} className="fixed bottom-0 left-0 z-40 pointer-events-none" />
            <div className="flex min-h-screen text-white bg-[#1a1a1a]">
                {/* Sidebar */}
                <aside className="w-64 bg-black p-6 flex flex-col justify-between fixed top-0 left-0 h-full z-30">
                    <div>
                        <Image src={logo} alt="Logo" width={200} height={200} className="mb-8" />
                        <nav className="space-y-4 text-xl">
                            <button onClick={() => router.push('/dashboard')} className="text-left w-full">Dashboard</button>
                            <button onClick={() => router.push('/register')} className="text-left w-full bg-gray-200 text-black rounded px-1 py-1">New Registration</button>
                            <button onClick={() => router.push('/verify')} className="text-left w-full">Verify Records</button>
                            <button onClick={() => router.push('/attendance')} className="text-left w-full">View Attendance</button>
                            <button onClick={() => router.push('/myaccount')} className="text-left w-full">My Account</button>
                        </nav>
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut();
                                router.push('/');
                            }}
                            className="text-left text-lg mt-10"
                        >
                            Logout
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-10 ml-64">
                    <h2 className="text-3xl font-bold mb-6">Register Intern</h2>
                    <section className="bg-[#2a2a2a] p-6 rounded-2xl max-w-xl">
                        <input
                            placeholder="SRN"
                            value={form.srn}
                            onChange={(e) => setForm({ ...form, srn: e.target.value })}
                            className="w-full p-2 mb-2 rounded bg-white text-black"
                        />
                        <input
                            placeholder="Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full p-2 mb-2 rounded bg-white text-black"
                        />
                        <input
                            placeholder="Email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full p-2 mb-2 rounded bg-white text-black"
                        />
                        <select
                            value={form.lab}
                            onChange={(e) => setForm({ ...form, lab: e.target.value })}
                            className="w-full p-2 mb-4 rounded bg-white text-black"
                        >
                            <option value="" disabled>
                                Select Lab
                            </option>
                            {labs.map((lab) => (
                                <option key={lab} value={lab}>
                                    {lab}
                                </option>
                            ))}
                        </select>

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
                    </section>
                    {status && <p className="mt-4 text-sm text-gray-300">{status}</p>}
                </main>
            </div>
        </>
    );
}
