export default function AdminSystemPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Admin — სისტემა / სეტინგები</h1>
      <div className="card p-6 text-sm text-white/70 space-y-2">
        <p>აქ შეიძლება მოგვიანებით დავამატოთ:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>გლობალური სეტინგები (საიტის fee %, min/max თანხები და ა.შ.).</li>
          <li>ლოგები (ბოლო კრიტიკული ქმედებები).</li>
          <li>მომსახურების ტექნიკური ინფო.</li>
        </ul>
      </div>
    </div>
  );
}
