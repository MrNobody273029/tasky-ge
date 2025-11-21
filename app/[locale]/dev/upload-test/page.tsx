// app/[locale]/dev/upload-test/page.tsx  (შენთან არსებული კომპონენტში ჩასვი)
"use client";
import { useState } from "react";

export default function CloudinaryTest() {
  const [file, setFile] = useState<File | null>(null);
  const [bucket, setBucket] = useState<"task"|"avatar"|"evidence">("task");
  const [msg, setMsg] = useState<string>("");

  async function onUpload() {
    setMsg("");
    if (!file) { setMsg("Pick a file first"); return; }

    try {
      // 1) მოვიმზადოთ ხელმოწერა და upload URL სერვერიდან
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: bucket }), // "task" | "avatar" | "evidence"
      });
      if (!signRes.ok) {
        const t = await signRes.text();
        throw new Error("sign failed: " + t);
      }
      const { signature, timestamp, apiKey, folder, uploadUrl } = await signRes.json();

      // 2) ავაგოთ FormData — არავითარი manual Content-Type!
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", String(apiKey));
      fd.append("timestamp", String(timestamp));
      fd.append("signature", String(signature));
      fd.append("folder", String(folder));        // მაგ: "tasky/tasks"
      fd.append("resource_type", "auto");         // ფოტო/ვიდეო/zip ავტომატურად

      // 3) პირდაპირ Cloudinary-ს API-ზე POST (HTTPS, არანაირი relative URL)
      const upRes = await fetch(uploadUrl, { method: "POST", body: fd }); 
      const txt = await upRes.text();             // პირველ რიგში ტექსტი წავიკითხოთ debug-ისთვის
      if (!upRes.ok) throw new Error(`upload ${upRes.status}: ${txt}`);

      const json = JSON.parse(txt);
      setMsg(`OK → ${json.secure_url}`);
      console.log("Cloudinary response:", json);
    } catch (e: any) {
      console.error(e);
      setMsg(String(e?.message || e));
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Cloudinary Upload Test</h1>
      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
      <select value={bucket} onChange={e => setBucket(e.target.value as any)} className="bg-black text-white p-2 rounded">
        <option value="task">task</option>
        <option value="avatar">avatar</option>
        <option value="evidence">evidence</option>
      </select>
      <button className="btn-hero-primary" onClick={onUpload}>Upload</button>
      <div className="text-red-400 mt-2">{msg}</div>
    </div>
  );
}
