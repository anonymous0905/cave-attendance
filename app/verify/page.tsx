"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface AttendanceRecord {
  id: string;
  srn: string;
  location_lat: number;
  location_lng: number;
  photo_url: string;
  students: {
    reference_image_url: string;
  };
}

export default function VerifyPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRecords = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }

      const { data: rows, error } = await supabase
          .from("attendance_logs")
          .select(`
          id,
          srn,
          location_lat,
          location_lng,
          photo_url,
          students:students!inner(reference_image_url)
        `)
          .eq("flagged", true);

      if (error) {
        console.error("Error fetching records:", error);
        return;
      }

      console.log("Fetched flagged records:", rows);
      setRecords(rows || []);
    };

    fetchRecords();
  }, [router]);

  const handleAction = async (id: string, verified: boolean) => {
    const { error } = await supabase
        .from("attendance_logs")
        .update({ flagged: false, verified })
        .eq("id", id);

    if (error) {
      console.error("Error updating record:", error);
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
                <span>SRN: {rec.srn}</span>
                <button
                    onClick={() => {
                      console.log("Selected record:", rec);
                      setSelected(rec);
                    }}
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
                  <h2 className="text-xl font-semibold">SRN: {selected.srn}</h2>
                  <button
                      onClick={() => setSelected(null)}
                      className="text-gray-500 text-2xl leading-none"
                  >
                    &times;
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <p className="font-semibold mb-2">Reference Image</p>
                    <img
                        src={selected.students?.reference_image_url}
                        alt="Reference"
                        width={240}
                        height={240}
                        className="rounded border"
                        onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold mb-2">Captured Image</p>
                    <img
                        src={selected.photo_url}
                        alt="Captured"
                        width={240}
                        height={240}
                        className="rounded border"
                        onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <p className="font-semibold mb-2">Location</p>
                  <iframe
                      title="location"
                      width="100%"
                      height="300"
                      className="w-full rounded"
                      src={`https://maps.google.com/maps?q=${selected.location_lat},${selected.location_lng}&z=15&output=embed`}
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
