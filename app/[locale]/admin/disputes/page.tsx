// app/[locale]/admin/disputes/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Gavel, RefreshCcw } from "lucide-react";

type Locale = "ka" | "en";

const dict = {
  ka: {
    title: "Admin — დავები (Disputes)",
    open: "ღია",
    resolved: "დასრულებული",
    refresh: "განახლება",
    loading: "იტვირთება…",
    empty: "სია ცარიელია.",
    resolve: "დასრულება / split",
    note: "შენიშვნა",
    clientRefund: "დამკვეთზე დაბრუნება (₾)",
    workerPayout: "შემსრულებელზე ჩარიცხვა (₾)",
    platformKeep: "პლატფორმას რჩება (₾)",
    save: "შენახვა",
    saving: "ინახება…",
    close: "დახურვა",
    error: "შეცდომა",
  },
  en: {
    title: "Admin — Disputes",
    open: "Open",
    resolved: "Resolved",
    refresh: "Refresh",
    loading: "Loading…",
    empty: "No disputes.",
    resolve: "Resolve / split",
    note: "Note",
    clientRefund: "Client refund (₾)",
    workerPayout: "Worker payout (₾)",
    platformKeep: "Platform keep (₾)",
    save: "Save",
    saving: "Saving…",
    close: "Close",
    error: "Error",
  },
} as const;

export default function AdminDisputesPage() {
  const params = useParams<{ locale?: string }>();
  const locale = (params?.locale === "en" ? "en" : "ka") as Locale;
  const t = dict[locale];

  const [tab, setTab] = useState<"OPEN" | "RESOLVED">("OPEN");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [modal, setModal] = useState<{ open: boolean; dispute: any | null }>({ open: false, dispute: null });
  const [clientRefund, setClientRefund] = useState("0");
  const [workerPayout, setWorkerPayout] = useState("0");
  const [platformKeep, setPlatformKeep] = useState("0");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const url = useMemo(() => `/api/admin/disputes?status=${tab}`, [tab]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(String(j?.error || "load_failed"));
      setItems(Array.isArray(j?.items) ? j.items : []);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const openResolve = (d: any) => {
    setModal({ open: true, dispute: d });
    try {
      const split = JSON.parse(String(d?.splitJson || "{}"));
      setClientRefund(String(split?.clientRefund ?? 0));
      setWorkerPayout(String(split?.workerPayout ?? 0));
      setPlatformKeep(String(split?.platformKeep ?? 0));
    } catch {
      setClientRefund("0");
      setWorkerPayout("0");
      setPlatformKeep("0");
    }
    setNote(String(d?.resolutionNote || ""));
  };

  const closeResolve = () => {
    setModal({ open: false, dispute: null });
    setSaving(false);
    setErr(null);
  };

  async function saveResolve() {
    if (!modal.dispute?.id) return;
    setSaving(true);
    setErr(null);

    try {
      const r = await fetch(`/api/admin/disputes/${modal.dispute.id}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientRefund: Math.max(0, Math.round(Number(clientRefund || 0))),
          workerPayout: Math.max(0, Math.round(Number(workerPayout || 0))),
          platformKeep: Math.max(0, Math.round(Number(platformKeep || 0))),
          note,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(String(j?.error || "resolve_failed"));
      closeResolve();
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <h1 className="text-3xl font-semibold">{t.title}</h1>

        <button
          onClick={load}
          disabled={loading}
          className="btn-hero-secondary text-sm inline-flex items-center gap-2 disabled:opacity-60"
          data-text={t.refresh}
        >
          <RefreshCcw className="w-4 h-4" />
          <span className="btn-text">{t.refresh}</span>
        </button>
      </div>

      <div className="card p-3 rounded-2xl bg-white/5 ring-1 ring-white/10 flex gap-2 flex-wrap">
        <button
          onClick={() => setTab("OPEN")}
          className={tab === "OPEN" ? "btn-tab-active text-sm" : "btn-hero-ghost text-sm"}
        >
          <span className="btn-text inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {t.open}
          </span>
        </button>

        <button
          onClick={() => setTab("RESOLVED")}
          className={tab === "RESOLVED" ? "btn-tab-active text-sm" : "btn-hero-ghost text-sm"}
        >
          <span className="btn-text inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {t.resolved}
          </span>
        </button>
      </div>

      {err && (
        <div className="card p-4 rounded-2xl bg-red-500/10 ring-1 ring-red-400/20 text-sm text-red-200">
          {t.error}: {err}
        </div>
      )}

      {loading ? (
        <div className="card p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 text-sm text-white/60">
          {t.loading}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 text-sm text-white/60">
          {t.empty}
        </div>
      ) : (
        <div className="card p-0 rounded-2xl overflow-hidden ring-1 ring-white/10">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Task</th>
                <th className="px-4 py-3 text-left">Evidence</th>
                <th className="px-4 py-3 text-left">Opened by</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 text-xs text-white/70">{String(d.id).slice(0, 10)}…</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{d?.task?.title ?? "—"}</div>
                    <div className="text-xs text-white/50">₾{Number(d?.task?.reward || 0)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/70">{d?.evidence?.id ? String(d.evidence.id).slice(0, 10) + "…" : "—"}</td>
                  <td className="px-4 py-3 text-xs text-white/70">
                    {d?.openedBy?.name || d?.openedBy?.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-1 rounded-full bg-white/5 ring-1 ring-white/10 text-white/70">
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openResolve(d)}
                      className="btn-hero-secondary text-xs inline-flex items-center gap-2"
                      data-text={t.resolve}
                    >
                      <Gavel className="w-4 h-4" />
                      <span className="btn-text">{t.resolve}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && modal.dispute && (
        <div className="fixed inset-0 z-[2147483648]">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeResolve} />
          <div className="absolute inset-x-0 top-10 mx-auto w-[min(92vw,720px)]">
            <div className="card p-5 rounded-2xl bg-[#0b0f16] ring-1 ring-white/15">
              <div className="flex items-start justify-between gap-3">
                <div className="text-xl font-bold">{t.resolve}</div>
                <button onClick={closeResolve} className="btn-hero-ghost text-xs">
                  <span className="btn-text">{t.close}</span>
                </button>
              </div>

              <div className="mt-4 grid sm:grid-cols-3 gap-3">
                <label className="text-xs text-white/60">
                  {t.clientRefund}
                  <input
                    value={clientRefund}
                    onChange={(e) => setClientRefund(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/5 ring-1 ring-white/10 p-2 outline-none"
                  />
                </label>

                <label className="text-xs text-white/60">
                  {t.workerPayout}
                  <input
                    value={workerPayout}
                    onChange={(e) => setWorkerPayout(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/5 ring-1 ring-white/10 p-2 outline-none"
                  />
                </label>

                <label className="text-xs text-white/60">
                  {t.platformKeep}
                  <input
                    value={platformKeep}
                    onChange={(e) => setPlatformKeep(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/5 ring-1 ring-white/10 p-2 outline-none"
                  />
                </label>
              </div>

              <label className="block mt-3 text-xs text-white/60">
                {t.note}
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-xl bg-white/5 ring-1 ring-white/10 p-2 outline-none"
                />
              </label>

              {err && (
                <div className="mt-3 p-3 rounded-xl bg-red-500/10 ring-1 ring-red-400/20 text-sm text-red-200">
                  {t.error}: {err}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={closeResolve} className="btn-hero-ghost text-sm">
                  <span className="btn-text">{t.close}</span>
                </button>
                <button
                  onClick={saveResolve}
                  disabled={saving}
                  className="btn-hero-primary text-sm disabled:opacity-60"
                  data-text={saving ? t.saving : t.save}
                >
                  <span className="btn-text">{saving ? t.saving : t.save}</span>
                </button>
              </div>

              <div className="text-xs text-white/40 mt-3">
                * Split ტრანზაქციები ჩაიწერება wallet-ში disputeId-ით (იდემპოტენტური). “platform keep” ჯერჯერობით მხოლოდ dispute-ში ინახება,
                რადგან შენს სქემაში პლატფორმის “wallet user” არ არსებობს.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
