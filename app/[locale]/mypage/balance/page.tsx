// app/[locale]/mypage/balance/page.tsx
'use client';

import * as React from 'react';
import MatrixLoader from '@/components/MatrixLoader'; // ⬅️ ეს დაამატე


type Locale = 'ka' | 'en';

type TxStatus = 'Completed' | 'Pending' | 'Failed' | 'OnHold';
type TxType = 'Earning' | 'PublishFee' | 'Withdrawal' | 'Other';
type PayMethod = 'balance' | 'card' | '' | string;

type Tx = {
  id?: string;
  date: string;               // ISO
  type: TxType | string;      // normalize later
  taskTitle?: string;
  amount: number;             // +earning / -fee / -withdrawal
  status: TxStatus | string;  // normalize later
  counterparty?: string;
  method?: PayMethod;         // balance | card | (legacy)
};

type WalletSummary = {
  available: number;
  pending: number;
  hold: number;
  lifetime: number;
  tx: Tx[];
};

/* ===== helpers ===== */
function fmt(n: number) {
  return (Math.round(n * 100) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function downloadCSV(filename: string, rows: Tx[]) {
  const header = ['Date', 'Type', 'Task', 'Amount', 'Status', 'Method'];
  const csv =
    [header]
      .concat(
        rows.map((r) => [
          new Date(r.date).toISOString().slice(0, 10),
          r.type,
          r.taskTitle ?? '',
          (r.amount >= 0 ? '+' : '') + r.amount,
          r.status,
          r.method ?? '',
        ]),
      )
      .map((a) => a.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n') + '\n';

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ===== normalize (UI-ს მხარეს) ===== */
function toType(v: any): TxType {
  if (!v) return 'Other';
  const s = String(v).toLowerCase().replace(/\s+/g, '');
  if (s.includes('earning')) return 'Earning';
  if (s.includes('publishfee') || s.includes('publish') || s.includes('fee'))
    return 'PublishFee';
  if (s.includes('withdraw')) return 'Withdrawal';
  return 'Other';
}
function toStatus(v: any): TxStatus {
  if (!v) return 'Completed';
  const s = String(v).toLowerCase();
  if (s.includes('pending')) return 'Pending';
  if (s.includes('hold')) return 'OnHold';
  if (s.includes('fail')) return 'Failed';
  return 'Completed';
}

/* ===== page ===== */
export default function Balance({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  const t =
    locale === 'ka'
      ? {
          title: 'ბალანსი',
          available: 'ხელმისაწვდომი',
          pending: 'მომლოდინე ჩარიცხვა',
          hold: 'დაყოვნებული',
          lifetime: 'ჯამური შემოსავალი',
          tx: 'ტრანზაქციები',
          date: 'თარიღი',
          type: 'ტიპი',
          task: 'დავალება',
          counterparty: 'მოწინააღმდეგე',
          amount: 'თანხა (₾)',
          status: 'სტატუსი',
          search: 'ტრანზაქციების ძებნა…',
          allTypes: 'ყველა ტიპი',
          anyStatus: 'სტატუსი',
          export: 'გატანა',
          earning: 'შემოსავალი',
          publishFee: 'სერვის-ფასი (გამოქვეყნება)',
          withdrawal: 'გატანა',
          other: 'სხვა',
          completed: 'დასრულებული',
          pendingS: 'მომლოდინე',
          onHoldS: 'დაყოვნებული',
          failed: 'წარუმატებელი',
          noTx: 'ტრანზაქციები ჯერ არ გაქვს.',
          addPayout: 'გადახდის მეთოდის დამატება',
          withdraw: 'ფულის გამოტანა',
          statements: 'სტეითმენთები',
          method: 'გადახდა',
          byBalance: 'ბალანსიდან',
          byCard: 'ბარათით',
          loading: 'იტვირთება…',
          loadError: 'ბალანსის ჩატვირთვის შეცდომა.',
        }
      : {
          title: 'My Balance',
          available: 'Available',
          pending: 'Pending clearance',
          hold: 'On hold',
          lifetime: 'Lifetime earnings',
          tx: 'Transactions',
          date: 'Date',
          type: 'Type',
          task: 'Task',
          counterparty: 'Counterparty',
          amount: 'Amount (₾)',
          status: 'Status',
          search: 'Search transactions…',
          allTypes: 'All Types',
          anyStatus: 'Any Status',
          export: 'Export',
          earning: 'Earning',
          publishFee: 'Service Fee (Publish)',
          withdrawal: 'Withdrawal',
          other: 'Other',
          completed: 'Completed',
          pendingS: 'Pending',
          onHoldS: 'On hold',
          failed: 'Failed',
          noTx: 'You have no transactions yet.',
          addPayout: 'Add payout method',
          withdraw: 'Withdraw funds',
          statements: 'Statements',
          method: 'Method',
          byBalance: 'Balance',
          byCard: 'Card',
          loading: 'Loading…',
          loadError: 'Failed to load wallet.',
        };

  /* ----- state (DB) ----- */
  const [summary, setSummary] = React.useState<WalletSummary | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);

  /* filters */
  const [q, setQ] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<TxType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] =
    React.useState<TxStatus | 'ALL'>('ALL');

  // ჩატვირთვა სერვერიდან
  React.useEffect(() => {
    let alive = true;
    setLoaded(false);
    setLoadErr(null);

    fetch('/api/my/wallet', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({} as any));
          throw new Error(j?.error || 'Request failed');
        }
        return (await r.json()) as WalletSummary;
      })
      .then((data) => {
        if (!alive) return;
        setSummary(data);
      })
      .catch((e: any) => {
        if (!alive) return;
        setLoadErr(e?.message || 'Error');
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });

    return () => {
      alive = false;
    };
  }, []);
  if (!loaded && !loadErr) {
    return <MatrixLoader />;
  }

  // computed summaries UI-სთვის
  const wallet = summary?.available ?? 0;
  const lifetime = summary?.lifetime ?? 0;

  const allTx: Tx[] = summary?.tx ?? [];

  // filters apply
  const rows = allTx
    .filter((r) =>
      !q
        ? true
        : (r.taskTitle ?? '')
            .toLowerCase()
            .includes(q.trim().toLowerCase()) ||
          String(r.type).toLowerCase().includes(q.trim().toLowerCase()) ||
          String(r.method ?? '').toLowerCase().includes(q.trim().toLowerCase()),
    )
    .filter((r) => (typeFilter === 'ALL' ? true : toType(r.type) === typeFilter))
    .filter((r) =>
      statusFilter === 'ALL' ? true : toStatus(r.status) === statusFilter,
    )
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const typeLabel = (tp: TxType): string => {
    switch (tp) {
      case 'Earning':
        return t.earning;
      case 'PublishFee':
        return t.publishFee;
      case 'Withdrawal':
        return t.withdrawal;
      default:
        return t.other;
    }
  };

  const statusPill = (st: TxStatus) => {
    const common =
      'px-2 py-0.5 rounded-full text-xs border inline-block leading-none';
    if (st === 'Completed')
      return (
        <span className={`${common} border-emerald-400/30 text-emerald-300`}>
          {t.completed}
        </span>
      );
    if (st === 'Pending')
      return (
        <span className={`${common} border-amber-400/30 text-amber-300`}>
          {t.pendingS}
        </span>
      );
    if (st === 'OnHold')
      return (
        <span className={`${common} border-sky-400/30 text-sky-300`}>
          {t.onHoldS}
        </span>
      );
    return (
      <span className={`${common} border-rose-400/30 text-rose-300`}>
        {t.failed}
      </span>
    );
  };

  const methodPill = (m?: PayMethod) => {
    if (!m) return null;
    const label = m === 'balance' ? t.byBalance : m === 'card' ? t.byCard : m;
    const cls =
      m === 'balance'
        ? 'border-cyan-400/40 text-cyan-200'
        : 'border-white/25 text-white/70';
    return (
      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs border ${cls}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header + actions */}

<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  {/* სათაური მარცხნივ */}
  <h1 className="text-2xl sm:text-3xl font-bold">{t.title}</h1>

  {/* Actions – მობილურზე ქვევით, დესკტოპზე მარჯვნივ */}
  <div className="flex flex-wrap gap-2">
    {/* Add payout method – secondary */}
    <button
      className="btn-hero-secondary text-sm"
      data-text={t.addPayout}
      type="button"
    >
      <span className="btn-text">{t.addPayout}</span>
    </button>

    {/* Withdraw – primary */}
    <button
      className="btn-hero-primary text-sm"
      data-text={t.withdraw}
      type="button"
    >
      <span className="btn-text">{t.withdraw}</span>
    </button>
  </div>
</div>



      {/* Error შეტყობინება ზედა ნაწილში */}
      {loadErr && (
        <div className="text-sm text-red-300">
          {t.loadError} ({loadErr})
        </div>
      )}


      {/* Summary cards */}
<div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-white/60 text-sm">{t.available}</div>
          <div className="text-2xl font-semibold">₾{fmt(wallet)}</div>
        </div>
        <div className="card p-5">
          <div className="text-white/60 text-sm">{t.lifetime}</div>
          <div className="text-2xl font-semibold">₾{fmt(lifetime)}</div>
        </div>
      </div>

      {/* Transactions */}
      <div className="card p-6">

<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div className="font-semibold">{t.tx}</div>

  <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
    <input
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder={t.search}
      className="px-3 py-2 rounded-lg bg-white/5 text-sm w-full sm:w-56"
    />

    <select
      value={typeFilter}
      onChange={(e) => setTypeFilter(e.target.value as any)}
      className="px-3 py-2 rounded-lg bg-black border border-white/40 text-sm text-white w-full sm:w-48"
    >
      <option value="ALL">{t.allTypes}</option>
      <option value="Earning">{t.earning}</option>
      <option value="PublishFee">{t.publishFee}</option>
      <option value="Withdrawal">{t.withdrawal}</option>
    </select>

  </div>
</div>


        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[880px] w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="text-left py-2">{t.date}</th>
                <th className="text-left">{t.type}</th>
                <th className="text-left">{t.task}</th>
                <th className="text-left">{t.counterparty}</th>
                <th className="text-right">{t.amount}</th>
                <th className="text-left">{t.status}</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr className="border-t border-white/10">
                  <td className="py-3 text-white/60" colSpan={6}>
                    {t.noTx}
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  

                  const tp = toType(r.type);
                  const st = toStatus(r.status);
                  const isPlus = r.amount >= 0;
                  return (
                    <tr key={r.id ?? i} className="border-t border-white/10">
                      <td className="py-2">
                        {new Date(r.date).toISOString().slice(0, 10)}
                      </td>
                      <td>
                        {typeLabel(tp)}
                        {methodPill(r.method)}
                      </td>
                      <td>{r.taskTitle ?? '—'}</td>
                      <td>{r.counterparty ?? '—'}</td>
                      <td
                        className={`text-right ${
                          isPlus ? 'text-green-400' : 'text-rose-300'
                        }`}
                      >
                        {isPlus ? '+' : ''}
                        {fmt(r.amount)}
                      </td>
                      <td>{statusPill(st)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
