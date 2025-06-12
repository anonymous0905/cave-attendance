"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

interface AttendanceRecord {
  id: number;
  reference_image_url: string;
  captured_image_url: string;
  latitude: number;
  longitude: number;
}

export default function VerifyPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRecords = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/login");
        return;
      }

      const { data: rows, error } = await supabase
        .from("attendance_logs")
        .select("*")
        .is("flagged", true);
      if (error) {
        console.error(error);
        return;
      }
      setRecords((rows as AttendanceRecord[]) || []);
    };

    fetchRecords();
  }, [router]);

  const handleAction = async (id: number, verified: boolean) => {
    const { error } = await supabase
      .from("attendance_logs")
      .update({ flagged: false, verified })
      .eq("id", id);
    if (error) {
      console.error(error);
      return;
    }
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setSelected(null);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Verify Records</h1>
      {records.length === 0 && <p>No flagged records.</p>}
      <ul className="space-y-4">
        {records.map((rec) => (
          <li
            key={rec.id}
            className="border p-4 rounded flex justify-between items-center"
          >
            <span>Record #{rec.id}</span>
            <button
              onClick={() => setSelected(rec)}
              className="text-blue-600 underline"
            >
              View
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded w-11/12 max-w-2xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Record #{selected.id}</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <Image
                src={selected.reference_image_url}
                alt="Reference"
                width={240}
                height={240}
                unoptimized
                className="rounded"
              />
              <Image
                src={selected.captured_image_url}
                alt="Captured"
                width={240}
                height={240}
                unoptimized
                className="rounded"
              />
            </div>
            <div className="my-4">
              <iframe
                title="location"
                width="100%"
                height="300"
                className="w-full rounded"
                src={`https://maps.google.com/maps?q=${selected.latitude},${selected.longitude}&z=15&output=embed`}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleAction(selected.id, true)}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Verify
              </button>
              <button
                onClick={() => handleAction(selected.id, false)}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
