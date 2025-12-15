// app/[locale]/mypage/balance/page.tsx
'use client';

import * as React from 'react';
import MatrixLoader from '@/components/MatrixLoader';

type Locale = 'ka' | 'en';

type TxStatus = 'Completed' | 'Pending' | 'Failed' | 'OnHold';
type TxType = 'Earning' | 'PublishFee' | 'Withdrawal' | 'Other';
type PayMethod = 'balance' | 'card' | '' | string;

type Tx = {
  id?: string;
  date: string; // ISO
  type: TxType | string;
  taskTitle?: string;
  amount: number;
  status: TxStatus | string;
  counterparty?: string;
  method?: PayMethod;
};

type WalletSummary = {
  available: number;
  pending: number;
  hold: number;
  lifetime: number;
  tx: Tx[];
};

type PayoutAccount = {
  id: string;
  account: string;
  createdAt: string;
};

/* ===== helpers ===== */
function fmt(n: number) {
  return (Math.round(n * 100) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeAccount(s: string) {
  return (s || '').replace(/[\s-]/g, '').trim();
}

/* ===== normalize (UI side) ===== */
function toType(v: any): TxType {
  if (!v) return 'Other';
  const s = String(v).toLowerCase().replace(/\s+/g, '');
  if (s.includes('earning')) return 'Earning';
  if (s.includes('publishfee') || s.includes('publish') || s.includes('fee')) return 'PublishFee';
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
export default function Balance({ params: { locale } }: { params: { locale: Locale } }) {
  const t =
    locale === 'ka'
      ? {
          title: 'ბალანსი',
          available: 'ხელმისაწვდომი',
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
          earning: 'შემოსავალი',
          publishFee: 'სერვის-ფასი (გამოქვეყნება)',
          withdrawal: 'გატანა',
          other: 'სხვა',
          completed: 'დასრულებული',
          pendingS: 'მომლოდინე',
          onHoldS: 'დაყოვნებული',
          failed: 'წარუმატებელი',
          noTx: 'ტრანზაქციები ჯერ არ გაქვს.',
          addPayout: 'ანგარიშის დამატება',
          withdraw: 'ფულის გამოტანა',
          method: 'გადახდა',
          byBalance: 'ბალანსიდან',
          byCard: 'ბარათით',
          loadError: 'ბალანსის ჩატვირთვის შეცდომა.',

          // payout modal
          payoutTitle: 'გადასარიცხი ანგარიშის დამატება',
          payoutAccountLabel: 'ანგარიში / IBAN',
          payoutSave: 'დამატება',
          payoutCancel: 'გაუქმება',
          payoutErrInvalid: 'ანგარიში არასწორია.',
          payoutErrExists: 'ეს ანგარიში უკვე დამატებულია.',
          payoutSaved: 'ანგარიში დაემატა.',

          // withdraw modal
          withdrawTitle: 'ფულის გამოტანა',
          withdrawAmount: 'თანხა (₾)',
          withdrawAccount: 'ანგარიში',
          withdrawSubmit: 'გატანა',
          withdrawClose: 'დახურვა',
          withdrawNeedAccount: 'ჯერ დაამატე მინიმუმ ერთი ანგარიში.',
          withdrawErrAmount: 'თანხა არასწორია.',
          withdrawErrInsufficient: 'ბალანსზე საკმარისი თანხა არ არის.',
          withdrawErrDaily: 'დღიური ლიმიტი ამოიწურა (24სთ-ში მაქს 500₾).',
          withdrawOk: 'გატანა დაფიქსირდა.',
        }
      : {
          title: 'My Balance',
          available: 'Available',
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
          earning: 'Earning',
          publishFee: 'Service Fee (Publish)',
          withdrawal: 'Withdrawal',
          other: 'Other',
          completed: 'Completed',
          pendingS: 'Pending',
          onHoldS: 'On hold',
          failed: 'Failed',
          noTx: 'You have no transactions yet.',
          addPayout: 'Add account',
          withdraw: 'Withdraw funds',
          method: 'Method',
          byBalance: 'Balance',
          byCard: 'Card',
          loadError: 'Failed to load wallet.',

          payoutTitle: 'Add payout account',
          payoutAccountLabel: 'Account / IBAN',
          payoutSave: 'Add',
          payoutCancel: 'Cancel',
          payoutErrInvalid: 'Invalid account.',
          payoutErrExists: 'This account already exists.',
          payoutSaved: 'Account added.',

          withdrawTitle: 'Withdraw funds',
          withdrawAmount: 'Amount (₾)',
          withdrawAccount: 'Account',
          withdrawSubmit: 'Withdraw',
          withdrawClose: 'Close',
          withdrawNeedAccount: 'Add at least one account first.',
          withdrawErrAmount: 'Invalid amount.',
          withdrawErrInsufficient: 'Insufficient balance.',
          withdrawErrDaily: 'Daily limit reached (max 500₾ per 24h).',
          withdrawOk: 'Withdrawal recorded.',
        };

  /* ----- wallet state ----- */
  const [summary, setSummary] = React.useState<WalletSummary | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);

  /* ----- payout accounts ----- */
  const [accounts, setAccounts] = React.useState<PayoutAccount[]>([]);
  const [accLoaded, setAccLoaded] = React.useState(false);

  /* filters */
  const [q, setQ] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<TxType | 'ALL'>('ALL');

  /* modals */
  const [addOpen, setAddOpen] = React.useState(false);
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);

  /* add account form */
  const [accValue, setAccValue] = React.useState('');
  const [accBusy, setAccBusy] = React.useState(false);
  const [accMsg, setAccMsg] = React.useState<{ ok?: string; err?: string }>({});

  /* withdraw form */
  const [wdAmount, setWdAmount] = React.useState('');
  const [wdAccountId, setWdAccountId] = React.useState<string>('');
  const [wdBusy, setWdBusy] = React.useState(false);
  const [wdMsg, setWdMsg] = React.useState<{ ok?: string; err?: string }>({});

  const wallet = summary?.available ?? 0;
  const lifetime = summary?.lifetime ?? 0;

  async function loadWallet() {
    setLoaded(false);
    setLoadErr(null);
    try {
      const r = await fetch('/api/my/wallet', { cache: 'no-store' });
      if (!r.ok) {
        const j = await r.json().catch(() => ({} as any));
        throw new Error(j?.error || 'Request failed');
      }
      const data = (await r.json()) as WalletSummary;
      setSummary(data);
    } catch (e: any) {
      setLoadErr(e?.message || 'Error');
    } finally {
      setLoaded(true);
    }
  }

  async function loadAccounts() {
    setAccLoaded(false);
    try {
      const r = await fetch('/api/my/payout-accounts', { cache: 'no-store' });
      if (!r.ok) throw new Error('fetch_failed');
      const data = (await r.json()) as PayoutAccount[];
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      setAccounts([]);
    } finally {
      setAccLoaded(true);
    }
  }

  React.useEffect(() => {
    let alive = true;
    (async () => {
      await Promise.all([loadWallet(), loadAccounts()]);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // loader
  if (!loaded && !loadErr) return <MatrixLoader />;

  const allTx: Tx[] = summary?.tx ?? [];
  const rows = allTx
    .filter((r) =>
      !q
        ? true
        : (r.taskTitle ?? '').toLowerCase().includes(q.trim().toLowerCase()) ||
          String(r.type).toLowerCase().includes(q.trim().toLowerCase()) ||
          String(r.method ?? '').toLowerCase().includes(q.trim().toLowerCase()),
    )
    .filter((r) => (typeFilter === 'ALL' ? true : toType(r.type) === typeFilter))
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
    const common = 'px-2 py-0.5 rounded-full text-xs border inline-block leading-none';
    if (st === 'Completed')
      return <span className={`${common} border-emerald-400/30 text-emerald-300`}>{t.completed}</span>;
    if (st === 'Pending')
      return <span className={`${common} border-amber-400/30 text-amber-300`}>{t.pendingS}</span>;
    if (st === 'OnHold')
      return <span className={`${common} border-sky-400/30 text-sky-300`}>{t.onHoldS}</span>;
    return <span className={`${common} border-rose-400/30 text-rose-300`}>{t.failed}</span>;
  };

  const methodPill = (m?: PayMethod) => {
    if (!m) return null;
    const label = m === 'balance' ? t.byBalance : m === 'card' ? t.byCard : m;
    const cls = m === 'balance' ? 'border-cyan-400/40 text-cyan-200' : 'border-white/25 text-white/70';
    return <span className={`ml-2 px-2 py-0.5 rounded-full text-xs border ${cls}`}>{label}</span>;
  };

  function openAdd() {
    setAccMsg({});
    setAccValue('');
    setAddOpen(true);
  }

  function openWithdraw() {
    setWdMsg({});
    setWdAmount('');
    const first = accounts?.[0]?.id || '';
    setWdAccountId(first);
    setWithdrawOpen(true);
  }

  async function submitAddAccount() {
    if (accBusy) return;
    setAccMsg({});

    const account = normalizeAccount(accValue);
    if (!account || account.length < 8) {
      setAccMsg({ err: t.payoutErrInvalid });
      return;
    }

    setAccBusy(true);
    try {
      const r = await fetch('/api/my/payout-accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ account }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) {
        if (j?.error === 'already_exists') setAccMsg({ err: t.payoutErrExists });
        else setAccMsg({ err: t.payoutErrInvalid });
        return;
      }

      setAccMsg({ ok: t.payoutSaved });
      await loadAccounts();
      // auto select latest
      const createdId = j?.id;
      if (createdId) setWdAccountId(createdId);
      // close after short UX (immediate)
      setAddOpen(false);
    } finally {
      setAccBusy(false);
    }
  }

  async function submitWithdraw() {
    if (wdBusy) return;
    setWdMsg({});

    const amount = Math.round(Number(wdAmount || 0));
    if (!amount || amount <= 0) {
      setWdMsg({ err: t.withdrawErrAmount });
      return;
    }
    if (!wdAccountId) {
      setWdMsg({ err: t.withdrawNeedAccount });
      return;
    }

    setWdBusy(true);
    try {
      const r = await fetch('/api/my/wallet/withdraw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount, accountId: wdAccountId }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) {
        if (j?.error === 'insufficient_balance') setWdMsg({ err: t.withdrawErrInsufficient });
        else if (j?.error === 'daily_limit') setWdMsg({ err: t.withdrawErrDaily });
        else setWdMsg({ err: t.withdrawErrAmount });
        return;
      }

      setWdMsg({ ok: t.withdrawOk });

      // update wallet immediately (server returns available)
      if (typeof j?.available === 'number') {
        setSummary((prev) => (prev ? { ...prev, available: Number(j.available) || 0 } : prev));
      }
      await loadWallet();
      setWithdrawOpen(false);
    } finally {
      setWdBusy(false);
    }
  }

  const noAccounts = accLoaded && accounts.length === 0;

  return (
    <div className="space-y-6">
      {/* Header + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">{t.title}</h1>

        <div className="flex flex-wrap gap-2">
          <button className="btn-hero-secondary text-sm" data-text={t.addPayout} type="button" onClick={openAdd}>
            <span className="btn-text">{t.addPayout}</span>
          </button>

          <button
            className="btn-hero-primary text-sm disabled:opacity-60"
            data-text={t.withdraw}
            type="button"
            onClick={openWithdraw}
            disabled={noAccounts}
            aria-disabled={noAccounts}
            title={noAccounts ? t.withdrawNeedAccount : undefined}
          >
            <span className="btn-text">{t.withdraw}</span>
          </button>
        </div>
      </div>

      {/* Error */}
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
                      <td className="py-2">{new Date(r.date).toISOString().slice(0, 10)}</td>
                      <td>
                        {typeLabel(tp)}
                        {methodPill(r.method)}
                      </td>
                      <td>{r.taskTitle ?? '—'}</td>
                      <td>{r.counterparty ?? '—'}</td>
                      <td className={`text-right ${isPlus ? 'text-green-400' : 'text-rose-300'}`}>
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

      {/* ADD PAYOUT MODAL */}
      {addOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAddOpen(false)} />
          <div className="card rounded-2xl p-6 max-w-lg w-[92vw] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{t.payoutTitle}</div>
              <button
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15"
                onClick={() => setAddOpen(false)}
                aria-label="close"
              >
                <span className="block text-center leading-8">✕</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-white/60 mb-1">{t.payoutAccountLabel}</div>
                <input
                  value={accValue}
                  onChange={(e) => setAccValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  placeholder={locale === 'ka' ? 'GE.. / IBAN' : 'IBAN'}
                  disabled={accBusy}
                />
              </div>

              {accMsg.err && <div className="text-red-300 text-sm">{accMsg.err}</div>}
              {accMsg.ok && <div className="text-green-300 text-sm">{accMsg.ok}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="btn-modal-close text-sm"
                  type="button"
                  onClick={() => setAddOpen(false)}
                  data-text={t.payoutCancel}
                >
                  <span className="btn-text">{t.payoutCancel}</span>
                </button>

                <button
                  className="btn-hero-primary text-sm disabled:opacity-60"
                  type="button"
                  onClick={submitAddAccount}
                  disabled={accBusy}
                  data-text={t.payoutSave}
                >
                  <span className="btn-text">{t.payoutSave}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setWithdrawOpen(false)} />
          <div className="card rounded-2xl p-6 max-w-lg w-[92vw] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{t.withdrawTitle}</div>
              <button
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15"
                onClick={() => setWithdrawOpen(false)}
                aria-label="close"
              >
                <span className="block text-center leading-8">✕</span>
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="text-white/70 text-sm">{t.withdrawNeedAccount}</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <div className="text-xs text-white/60 mb-1">{t.withdrawAmount}</div>
                    <input
                      value={wdAmount}
                      onChange={(e) => setWdAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                      type="number"
                      min={1}
                      step={1}
                      disabled={wdBusy}
                    />
                    <div className="text-xs text-white/50 mt-1">
                      {locale === 'ka' ? `ხელმისაწვდომი: ₾${fmt(wallet)}` : `Available: ₾${fmt(wallet)}`}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-white/60 mb-1">{t.withdrawAccount}</div>
                    <select
                      value={wdAccountId}
                      onChange={(e) => setWdAccountId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-white/20 text-sm text-white"
                      disabled={wdBusy}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.account}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {wdMsg.err && <div className="text-red-300 text-sm">{wdMsg.err}</div>}
                {wdMsg.ok && <div className="text-green-300 text-sm">{wdMsg.ok}</div>}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="btn-modal-close text-sm"
                    type="button"
                    onClick={() => setWithdrawOpen(false)}
                    data-text={t.withdrawClose}
                  >
                    <span className="btn-text">{t.withdrawClose}</span>
                  </button>

                  <button
                    className="btn-hero-primary text-sm disabled:opacity-60"
                    type="button"
                    onClick={submitWithdraw}
                    disabled={wdBusy}
                    data-text={t.withdrawSubmit}
                  >
                    <span className="btn-text">{t.withdrawSubmit}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
