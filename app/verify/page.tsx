"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/public/cave-logo1.png";
import nav from "@/public/nav-logo.png";

interface AttendanceRecord {
  id: string;
  srn: string;
  location_lat: number;
  location_lng: number;
  photo_url: string;
  reason_flagged: string | null;
  lab?: string | null;
}

export default function VerifyPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentLab, setStudentLab] = useState<string | null>(null);
  const [labs, setLabs] = useState<string[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [filterLab, setFilterLab] = useState<string>("all");
  const [filterReason, setFilterReason] = useState<string>("all");
  const router = useRouter();

  const filteredRecords = records.filter(
      (r) =>
          (filterLab === "all" || r.lab === filterLab) &&
          (filterReason === "all" ||
              (r.reason_flagged ?? "Reason not found") === filterReason),
  );

  useEffect(() => {
    const fetchRecords = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }

      const { data: rows, error } = await supabase
          .from("attendance_logs")
          .select("id, srn, location_lat, location_lng, photo_url, reason_flagged")
          .eq("flagged", true);

      if (error) {
        console.error("Error fetching records:", error);
        return;
      }

      if (!rows) {
        setRecords([]);
        return;
      }

      const srns = rows.map((r) => r.srn);
      const { data: students, error: studentsErr } = await supabase
          .from("students")
          .select("srn, lab")
          .in("srn", srns);

      if (studentsErr) {
        console.error("Error fetching labs:", studentsErr);
      }

      const labMap: Record<string, string | null> = {};
      students?.forEach((s) => {
        labMap[s.srn] = s.lab;
      });

      const uniqueLabs = Array.from(
          new Set((students || []).map((s) => s.lab).filter(Boolean)),
      ) as string[];
      setLabs(uniqueLabs);

      const withLab = rows.map((r) => ({ ...r, lab: labMap[r.srn] || null }));
      const uniqueReasons = Array.from(
          new Set(withLab.map((r) => r.reason_flagged ?? "Reason not found")),
      );
      setReasons(uniqueReasons);
      console.log("Fetched flagged records:", withLab);
      setRecords(withLab);
    };

    fetchRecords();
  }, [router]);

  const handleSelectRecord = async (rec: AttendanceRecord) => {
    setSelected(rec);
    console.log("Selected record:", rec);

    const { data, error } = await supabase
        .from("students")
        .select("reference_image_url, name, lab")
        .eq("srn", rec.srn)
        .single();

    if (error) {
      console.error("Error fetching student info:", error);
      setReferenceImageUrl(null);
      setStudentName(null);
      setStudentLab(null);
    } else {
      setReferenceImageUrl(data.reference_image_url);
      setStudentName(data.name);
      setStudentLab(data.lab);
    }
  };

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
    setReferenceImageUrl(null);
    setStudentName(null);
    setStudentLab(null);
  };

  return (
      <>
        <Image src={nav} alt="nav" width={250} height={900} className="fixed bottom-0 left-0 z-40 pointer-events-none" />
        <div className="flex min-h-screen text-white bg-[#1a1a1a]">
          <aside className="w-64 bg-black p-6 flex flex-col justify-between fixed top-0 left-0 h-full z-30">
            <div>
              <Image src={logo} alt="Logo" width={200} height={200} className="mb-8" />
              <nav className="space-y-4 text-xl">
                <button onClick={() => router.push('/dashboard')} className="text-left w-full">Dashboard</button>
                <button onClick={() => router.push('/register')} className="text-left w-full">New Registration</button>
                <button onClick={() => router.push('/verify')} className="text-left w-full bg-gray-200 text-black rounded px-1 py-1">Verify Records</button>
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

          <main className="flex-1 p-10 ml-64">
            <h2 className="text-3xl font-bold mb-6">Verify Records</h2>

            <div className="mb-4 flex gap-4 flex-wrap">
              <div>
                <label className="mr-2">Filter by Lab:</label>
                <select
                    value={filterLab}
                    onChange={(e) => setFilterLab(e.target.value)}
                    className="text-black p-1 rounded"
                >
                  <option value="all">All</option>
                  {labs.map((lab) => (
                      <option key={lab} value={lab}>
                        {lab}
                      </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mr-2">Filter by Reason:</label>
                <select
                    value={filterReason}
                    onChange={(e) => setFilterReason(e.target.value)}
                    className="text-black p-1 rounded"
                >
                  <option value="all">All</option>
                  {reasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredRecords.length === 0 && <p>No flagged records.</p>}

            {filteredRecords.length > 0 && (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left bg-[#2a2a2a]">
                      <th className="p-2">SRN</th>
                      <th className="p-2">Lab</th>
                      <th className="p-2">Reason Flagged</th>
                      <th className="p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((rec) => (
                        <tr key={rec.id} className="border-b border-gray-700">
                          <td className="p-2">{rec.srn}</td>
                          <td className="p-2">{rec.lab || '-'}</td>
                          <td className="p-2">
                            {rec.reason_flagged ?? 'Reason not found'}
                          </td>
                          <td className="p-2">
                            <button
                                onClick={() => handleSelectRecord(rec)}
                                className="text-blue-300 underline"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
            )}

        {selected && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-4 rounded w-11/12 max-w-2xl text-black">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">SRN: {selected.srn}</h2>
                    {studentName && <p className="text-black">Name: {studentName}</p>}
                    {studentLab && <p className="text-black">Lab: {studentLab}</p>}
                    <p className="text-black">Reason: {selected.reason_flagged ?? 'Reason not found'}</p>
                  </div>
                  <button
                      onClick={() => {
                        setSelected(null);
                        setReferenceImageUrl(null);
                        setStudentName(null);
                        setStudentLab(null);
                      }}
                      className="text-black text-2xl leading-none"
                  >
                    &times;
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <p className="font-semibold mb-2">Reference Image</p>
                    {referenceImageUrl ? (
                        <img
                            src={referenceImageUrl}
                            alt="Reference"
                            width={240}
                            height={240}
                            className="rounded border"
                            onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                        />
                    ) : (
                        <p className="text-sm text-black">Loading...</p>
                    )}
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
          </main>
        </div>
      </>
  );
}
