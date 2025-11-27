// app/[locale]/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  createdAt: string;
  commissionPct: number;
  tasksPosted: number;
  tasksTaken: number;
};

export default function AdminUsersPage() {
  const { locale } = useParams() as { locale: string };
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/users');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Failed to load users');
        }
        const data = (await res.json()) as { items: AdminUserRow[] };
        if (!cancelled) {
          setUsers(data.items || []);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Admin — მომხმარებლები</h1>

      <div className="card p-4 text-sm text-white/70">
        აქ ჩანს ყველა მომხმარებელი, მათი ბალანსი/აქტივობა და საკომისიო (%).
        შემდგომში აქედან გადავხვტებით დეტალურ ანალიტიკაზე.
      </div>

      {loading && (
        <div className="card p-6 text-sm text-white/60">
          იტვირთება მომხმარებლების სია...
        </div>
      )}

      {error && !loading && (
        <div className="card p-4 text-sm text-red-400">
          შეცდომა სიის მიღებისას: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3 text-left">მომხმარებელი</th>
                <th className="px-4 py-3 text-left">კონტაქტი</th>
                <th className="px-4 py-3 text-left">დარეგისტრირდა</th>
                <th className="px-4 py-3 text-right">დადებული</th>
                <th className="px-4 py-3 text-right">აღებული</th>
                <th className="px-4 py-3 text-right">საკომისიო</th>
                <th className="px-4 py-3 text-right">პროფილი</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => {
                const created = new Date(u.createdAt).toLocaleDateString('ka-GE');
                const initial =
                  (u.name?.[0] || u.email?.[0] || '?').toUpperCase();

                return (
                  <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-xs font-semibold">
                          {u.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.image}
                              alt={u.name || u.email}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{initial}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-white">
                            {u.name || u.email.split('@')[0]}
                          </span>
                          <span className="text-xs text-white/50">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-xs text-white/70">
                        {u.phone ? u.phone : <span className="text-white/30">—</span>}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs text-white/70">
                      {created}
                    </td>

                    <td className="px-4 py-3 text-right text-xs">
                      {u.tasksPosted}
                    </td>

                    <td className="px-4 py-3 text-right text-xs">
                      {u.tasksTaken}
                    </td>

                    <td className="px-4 py-3 text-right text-xs">
                      {u.commissionPct}%
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/${locale}/admin/users/${u.id}`}
                        className="inline-flex items-center rounded-full border border-cyan-400/60 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-400/10 transition"
                      >
                        პროფილი
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-sm text-white/50"
                  >
                    მომხმარებლების სია ცარიელია.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
