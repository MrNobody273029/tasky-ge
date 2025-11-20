export default function Admin(){
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin (Demo)</h1>
      <div className="card p-6 space-y-3">
        <div className="text-white/70">This minimal admin stub shows how moderation/finance consoles can live here later.</div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card p-4"><div className="font-semibold">Users</div><div className="text-sm text-white/70">1</div></div>
          <div className="card p-4"><div className="font-semibold">Tasks</div><div className="text-sm text-white/70">1</div></div>
          <div className="card p-4"><div className="font-semibold">Submissions</div><div className="text-sm text-white/70">0</div></div>
        </div>
      </div>
    </div>
  );
}
