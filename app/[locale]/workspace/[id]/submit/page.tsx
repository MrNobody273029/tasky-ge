export default function SubmitEvidence(){
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Submit Deliverables</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <form className="card p-6 space-y-4 lg:col-span-2">
          <div>
            <label className="block text-sm text-white/70 mb-1">Submission note*</label>
            <textarea className="w-full px-3 py-2 rounded-lg bg-white/5 min-h-[120px]" placeholder="Briefly describe what you did and what's included."/>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-3">Photos uploader (max 10)</div>
            <div className="card p-3">Video uploader (≤60s)</div>
            <div className="card p-3">Links (add multiple)</div>
            <div className="card p-3">Files (PDF/DOC/ZIP)</div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-cyan"/> I confirm this submission is my own work.
          </label>
          <div className="flex gap-3 justify-end">
            <button className="px-4 py-2 rounded-lg bg-white/10">Save draft</button>
            <button className="px-4 py-2 rounded-lg bg-cyan text-black font-semibold">Submit for review</button>
          </div>
        </form>
        <aside className="card p-6">
          <div className="font-semibold mb-2">Preview</div>
          <div className="h-40 rounded-xl bg-white/5"></div>
        </aside>
      </div>
    </div>
  );
}
