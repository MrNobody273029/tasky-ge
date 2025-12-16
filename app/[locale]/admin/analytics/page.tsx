// app/[locale]/admin/analytics/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Coins,
  Users,
  Package,
  ShieldAlert,
  TrendingUp,
  RefreshCcw,
} from "lucide-react";

type Locale = "ka" | "en";
type Group = "day" | "week" | "month";

type AnalyticsResp = {
  range: { from: string; to: string; group: Group };
  kpis: any;
  series: Array<any>;
  pies: {
    categories: { name: string; value: number }[];
    location: { name: string; value: number }[];
    taskType: { name: string; value: number }[];
  };
  top: { authorsByTasksPosted: { id: string; label: string; value: number }[] };
};

const dict = {
  ka: {
    title: "Admin — ანალიტიკა",
    subtitle: "სრული სტატისტიკა და ტრენდები (Tasks / Evidence / Wallet)",
    range: "დიაპაზონი",
    from: "დან",
    to: "მდე",
    group: "დაჯგუფება",
    day: "დღე",
    week: "კვირა",
    month: "თვე",
    refresh: "განახლება",
    loading: "იტვირთება…",
    error: "შეცდომა მონაცემების მიღებისას",

    kpi_newUsers: "ახალი მომხმარებლები",
    kpi_tasksTotal: "დავალებები (სულ)",
    kpi_tasksPublished: "გამოქვეყნებული",
    kpi_tasksDraft: "დრაფტები",
    kpi_exclusive: "ექსკლუზიური",
    kpi_multi: "Multi",
    kpi_claims: "აღებები (claims)",
    kpi_apps: "მოთხოვნები (exclusive)",
    kpi_ev: "მტკიცებულებები",
    kpi_wallet: "Wallet",

    ev_pending: "Pending",
    ev_approved: "Approved",
    ev_rejected: "Rejected",
    ev_needsFixes: "Needs fixes",
    ev_expired: "Expired",
    ev_auto: "Auto-approved",

    w_publishFees: "Publish fees (Revenue)",
    w_earnings: "Worker earnings paid",
    w_withdrawals: "Withdrawals",
    w_net: "Net internal delta",

    charts: "გრაფიკები",
    series_tasks: "დავალებები",
    series_fees: "Publish fees",
    series_evidences: "Evidence (Approved/Pending/Expired)",
    series_withdrawals: "Withdrawals",

    pies: "დაწვრილებით",
    pie_categories: "კატეგორიები",
    pie_location: "ლოკაცია",
    pie_type: "ტიპი",

    top: "Top",
    top_authors: "Top ავტორები (დავალებების რაოდენობით)",
    empty: "მონაცემი არ არის ამ დიაპაზონში.",
  },
  en: {
    title: "Admin — Analytics",
    subtitle: "Full stats & trends (Tasks / Evidence / Wallet)",
    range: "Range",
    from: "From",
    to: "To",
    group: "Group",
    day: "Day",
    week: "Week",
    month: "Month",
    refresh: "Refresh",
    loading: "Loading…",
    error: "Failed to load analytics",

    kpi_newUsers: "New users",
    kpi_tasksTotal: "Tasks (total)",
    kpi_tasksPublished: "Published",
    kpi_tasksDraft: "Drafts",
    kpi_exclusive: "Exclusive",
    kpi_multi: "Multi",
    kpi_claims: "Taken (claims)",
    kpi_apps: "Applications (exclusive)",
    kpi_ev: "Evidences",
    kpi_wallet: "Wallet",

    ev_pending: "Pending",
    ev_approved: "Approved",
    ev_rejected: "Rejected",
    ev_needsFixes: "Needs fixes",
    ev_expired: "Expired",
    ev_auto: "Auto-approved",

    w_publishFees: "Publish fees (Revenue)",
    w_earnings: "Worker earnings paid",
    w_withdrawals: "Withdrawals",
    w_net: "Net internal delta",

    charts: "Charts",
    series_tasks: "Tasks",
    series_fees: "Publish fees",
    series_evidences: "Evidence (Approved/Pending/Expired)",
    series_withdrawals: "Withdrawals",

    pies: "Breakdowns",
    pie_categories: "Categories",
    pie_location: "Location",
    pie_type: "Type",

    top: "Top",
    top_authors: "Top authors (tasks posted)",
    empty: "No data for this range.",
  },
} as const;

function toYmdLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = startOfTodayLocal();
  d.setDate(d.getDate() - n);
  return d;
}

function fmtInt(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toLocaleString() : "0";
}

function MiniKpi({
  icon,
  title,
  value,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-white/60">{title}</div>
          <div className="text-xl font-extrabold tracking-tight">{value}</div>
          {sub ? <div className="text-xs text-white/50 mt-1">{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}

function SimpleBars({
  title,
  rows,
  valueLabel,
}: {
  title: string;
  rows: { label: string; value: number }[];
  valueLabel?: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="card p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">{title}</div>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-white/50 mt-4">—</div>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-xs text-white/70 truncate">{r.label}</div>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10">
                <div
                  className="h-full bg-cyan/60"
                  style={{ width: `${Math.round((r.value / max) * 100)}%` }}
                />
              </div>
              <div className="w-20 text-right text-xs text-white/70">
                {valueLabel ? valueLabel(r.value) : fmtInt(r.value)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Pie({
  title,
  data,
}: {
  title: string;
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, x) => s + (Number(x.value) || 0), 0);
  const size = 140;
  const r = 52;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;

  // no explicit colors: use strokeDasharray with default stroke; rely on CSS ring/opacity
  // We'll render slices as separate circles with varying dash offsets, different opacities.
  const slices = data
    .filter((x) => x.value > 0)
    .map((x, i) => {
      const frac = total > 0 ? x.value / total : 0;
      const dash = 2 * Math.PI * r;
      const dashLen = dash * frac;
      const gapLen = dash - dashLen;

      const offset = dash * (1 - acc);
      acc += frac;

      return (
        <circle
          key={x.name}
          cx={cx}
          cy={cy}
          r={r}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="14"
          strokeDasharray={`${dashLen} ${gapLen}`}
          strokeDashoffset={offset}
          className="text-cyan"
          opacity={0.25 + (i % 6) * 0.12}
          strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      );
    });

  return (
    <div className="card p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
      <div className="font-semibold">{title}</div>

      {total <= 0 ? (
        <div className="text-sm text-white/50 mt-4">—</div>
      ) : (
        <div className="mt-4 flex flex-col sm:flex-row gap-4 sm:items-center">
          <svg width={size} height={size} className="shrink-0">
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="transparent"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="14"
            />
            {slices}
          </svg>

          <div className="flex-1 space-y-2">
            {data
              .filter((x) => x.value > 0)
              .sort((a, b) => b.value - a.value)
              .slice(0, 8)
              .map((x, i) => (
                <div key={x.name} className="flex items-center justify-between gap-3 text-xs">
                  <div className="text-white/80 truncate">{x.name}</div>
                  <div className="text-white/60">
                    {fmtInt(x.value)}{" "}
                    <span className="text-white/40">
                      ({total ? Math.round((x.value / total) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const params = useParams<{ locale?: string }>();
  const locale = (params?.locale === "en" ? "en" : "ka") as Locale;
  const t = dict[locale];

  const [from, setFrom] = useState<string>(() => toYmdLocal(daysAgo(30)));
  const [to, setTo] = useState<string>(() => toYmdLocal(startOfTodayLocal()));
  const [group, setGroup] = useState<Group>("day");

  const [data, setData] = useState<AnalyticsResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const queryUrl = useMemo(() => {
    const f = new Date(`${from}T00:00:00`);
    const tt = new Date(`${to}T00:00:00`);
    return `/api/admin/analytics?from=${encodeURIComponent(f.toISOString())}&to=${encodeURIComponent(
      tt.toISOString()
    )}&group=${group}`;
  }, [from, to, group]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(queryUrl, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(String(j?.error || "load_failed"));
      setData(j as AnalyticsResp);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const k = data?.kpis;

  const series = data?.series ?? [];
  const hasAny = !!data && (k?.tasksTotal > 0 || k?.wallet?.publishFeesCollected > 0 || k?.evidences?.pending > 0);

  // build simple series for bars
  const seriesTasks = series.map((x) => ({ label: x.label, value: Number(x.tasks) || 0 }));
  const seriesFees = series.map((x) => ({ label: x.label, value: Number(x.publishFees) || 0 }));
  const seriesWithdrawals = series.map((x) => ({ label: x.label, value: Number(x.withdrawals) || 0 }));

  // evidence combined (show Approved + Pending + Expired as separate small lists)
  const evApprovedSeries = series.map((x) => ({ label: x.label, value: Number(x.evApproved) || 0 }));
  const evPendingSeries = series.map((x) => ({ label: x.label, value: Number(x.evPending) || 0 }));
  const evExpiredSeries = series.map((x) => ({ label: x.label, value: Number(x.evExpired) || 0 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{t.title}</h1>
          <div className="text-sm text-white/60 mt-1">{t.subtitle}</div>
        </div>

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

      {/* Filters */}
      <div className="card p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Calendar className="w-4 h-4" />
            <span className="font-semibold">{t.range}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <label className="text-xs text-white/60">
              {t.from}
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full sm:w-[180px] rounded-xl bg-white/5 ring-1 ring-white/10 p-2 outline-none"
              />
            </label>

            <label className="text-xs text-white/60">
              {t.to}
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full sm:w-[180px] rounded-xl bg-white/5 ring-1 ring-white/10 p-2 outline-none"
              />
            </label>

            <label className="text-xs text-white/60">
              {t.group}
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value as Group)}
                className="mt-1 w-full sm:w-[180px] rounded-xl bg-white/5 ring-1 ring-white/10 p-2 outline-none"
              >
                <option value="day">{t.day}</option>
                <option value="week">{t.week}</option>
                <option value="month">{t.month}</option>
              </select>
            </label>

            <button
              onClick={load}
              disabled={loading}
              className="btn-hero-primary text-sm inline-flex items-center gap-2 disabled:opacity-60"
              data-text={t.refresh}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="btn-text">{loading ? t.loading : t.refresh}</span>
            </button>
          </div>
        </div>
      </div>

      {err && (
        <div className="card p-4 rounded-2xl bg-red-500/10 ring-1 ring-red-400/20 text-sm text-red-200">
          {t.error}: {err}
        </div>
      )}

      {loading && (
        <div className="card p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 text-sm text-white/60">
          {t.loading}
        </div>
      )}

      {!loading && data && !hasAny && (
        <div className="card p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 text-sm text-white/60">
          {t.empty}
        </div>
      )}

      {!loading && data && hasAny && (
        <>
          {/* KPI grid */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MiniKpi
              icon={<Users className="w-5 h-5 text-cyan" />}
              title={t.kpi_newUsers}
              value={fmtInt(k?.newUsers)}
            />
            <MiniKpi
              icon={<Package className="w-5 h-5 text-cyan" />}
              title={t.kpi_tasksTotal}
              value={fmtInt(k?.tasksTotal)}
              sub={`${t.kpi_tasksPublished}: ${fmtInt(k?.tasksPublished)} • ${t.kpi_tasksDraft}: ${fmtInt(k?.tasksDraft)}`}
            />
            <MiniKpi
              icon={<BarChart3 className="w-5 h-5 text-cyan" />}
              title={t.kpi_claims}
              value={fmtInt(k?.claimsTotal)}
              sub={`${t.kpi_exclusive}: ${fmtInt(k?.tasksExclusive)} • ${t.kpi_multi}: ${fmtInt(k?.tasksMulti)}`}
            />
            <MiniKpi
              icon={<Coins className="w-5 h-5 text-cyan" />}
              title={t.kpi_wallet}
              value={`₾${fmtInt(k?.wallet?.publishFeesCollected)}`}
              sub={`${t.w_earnings}: ₾${fmtInt(k?.wallet?.workerEarningsPaid)}`}
            />
          </div>

          {/* Evidence + Wallet details */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan" />
                <div className="font-semibold">{t.kpi_ev}</div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <div className="text-white/60">{t.ev_pending}</div>
                  <div className="text-lg font-bold">{fmtInt(k?.evidences?.pending)}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <div className="text-white/60">{t.ev_approved}</div>
                  <div className="text-lg font-bold">{fmtInt(k?.evidences?.approved)}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <div className="text-white/60">{t.ev_rejected}</div>
                  <div className="text-lg font-bold">{fmtInt(k?.evidences?.rejected)}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <div className="text-white/60">{t.ev_needsFixes}</div>
                  <div className="text-lg font-bold">{fmtInt(k?.evidences?.needsFixes)}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <div className="text-white/60">{t.ev_expired}</div>
                  <div className="text-lg font-bold">{fmtInt(k?.evidences?.expired)}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <div className="text-white/60">{t.ev_auto}</div>
                  <div className="text-lg font-bold">{fmtInt(k?.evidences?.autoApproved)}</div>
                </div>
              </div>
            </div>

            <div className="card p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-cyan" />
                <div className="font-semibold">{t.kpi_wallet}</div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <div className="text-white/60">{t.w_publishFees}</div>
                  <div className="text-lg font-bold">₾{fmtInt(k?.wallet?.publishFeesCollected)}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <div className="text-white/60">{t.w_earnings}</div>
                  <div className="text-lg font-bold">₾{fmtInt(k?.wallet?.workerEarningsPaid)}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <div className="text-white/60">{t.w_withdrawals}</div>
                  <div className="text-lg font-bold">₾{fmtInt(k?.wallet?.withdrawalsTotal)}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <div className="text-white/60">{t.w_net}</div>
                  <div className="text-lg font-bold">₾{fmtInt(k?.wallet?.netInternalDelta)}</div>
                </div>
              </div>

              <div className="text-xs text-white/40 mt-3">
                * Platform revenue აქ ითვლება როგორც Publish fee (PUBLISH_FEE). Commission payouts-ზე ჯერ არ გაქვს იმპლემენტირებული.
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="space-y-4">
            <div className="text-lg font-semibold">{t.charts}</div>
            <div className="grid lg:grid-cols-2 gap-4">
              <SimpleBars
                title={t.series_tasks}
                rows={seriesTasks.slice(-14)}
              />
              <SimpleBars
                title={t.series_fees}
                rows={seriesFees.slice(-14)}
                valueLabel={(v) => `₾${fmtInt(v)}`}
              />
              <SimpleBars
                title={t.series_withdrawals}
                rows={seriesWithdrawals.slice(-14)}
                valueLabel={(v) => `₾${fmtInt(v)}`}
              />
              <div className="grid grid-cols-1 gap-3">
                <SimpleBars title={`${t.series_evidences} — Approved`} rows={evApprovedSeries.slice(-14)} />
                <SimpleBars title={`${t.series_evidences} — Pending`} rows={evPendingSeries.slice(-14)} />
                <SimpleBars title={`${t.series_evidences} — Expired`} rows={evExpiredSeries.slice(-14)} />
              </div>
            </div>
          </div>

          {/* Pies + top */}
          <div className="space-y-4">
            <div className="text-lg font-semibold">{t.pies}</div>
            <div className="grid lg:grid-cols-3 gap-4">
              <Pie title={t.pie_categories} data={data.pies.categories} />
              <Pie title={t.pie_location} data={data.pies.location} />
              <Pie title={t.pie_type} data={data.pies.taskType} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-lg font-semibold">{t.top}</div>
            <SimpleBars
              title={t.top_authors}
              rows={(data.top.authorsByTasksPosted || []).map((x) => ({ label: x.label, value: x.value }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
