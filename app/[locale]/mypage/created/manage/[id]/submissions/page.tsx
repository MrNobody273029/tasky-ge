export default function Submissions(){
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Submissions</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-4 lg:col-span-1">
          <div className="font-semibold mb-2">Queue</div>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 rounded-lg bg-white/10">N. Giorgadze — Under Review</button>
          </div>
        </div>
        <div className="card p-6 lg:col-span-2 space-y-4">
          <div className="font-semibold">Submission summary</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="card p-3">Photos (3)</div>
            <div className="card p-3">Links (1)</div>
            <div className="card p-3">Files (1)</div>
            <div className="card p-3">Video (0)</div>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="px-4 py-2 rounded-lg border border-white/10">Request changes</button>
            <button className="px-4 py-2 rounded-lg bg-cyan text-black font-semibold">Approve</button>
          </div>
        </div>
      </div>
    </div>
  );
}
