// app/[locale]/admin/users/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import TaskCard, { TaskCardInput } from "@/components/TaskCard";
import TaskModal from "@/components/task/TaskModal";

type Locale = "ka" | "en";

type UserCore = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  createdAt: string;
  commissionPct: number;
  ratingWorkerAvg: number;
  ratingWorkerCount: number;
  ratingClientAvg: number;
  ratingClientCount: number;
};

type Stats = {
  tasksPosted: number;
  tasksTaken: number;
  completedTasks: number;
  failedTasks: number;
  earnedTotal: number;
  spentTotal: number;
};

type TaskCardPayload = {
  id: string;
  title: string;
  desc: string | null;
  category: string | null;
  skill: string | null;
  reward: number;
  deadline: string | null;
  where: "REMOTE" | "ONSITE";
  exclusive: boolean;
  status: string;
  locale: "ka" | "en";
  createdAt: string;
};

type TakenFlag = "pending" | "rejected" | "approved" | null;

type TakenItem = {
  task: TaskCardPayload;
  flag: TakenFlag;
  createdAt: string;
};

type Payload = {
  user: UserCore;
  stats: Stats;
  createdTasks: TaskCardPayload[];
  takenItems: TakenItem[];
};

type Tab = "overview" | "created" | "taken" | "analytics";

export default function AdminUserProfilePage() {
  const { id, locale } = useParams() as { id: string; locale: Locale };

  const [data, setData] = useState<Payload | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savingPct, setSavingPct] = useState(false);
  const [commissionDraft, setCommissionDraft] = useState<string>("");
const [pctSavedMsg, setPctSavedMsg] = useState<string | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const t =
    locale === "ka"
      ? {
          pageTitle: "Admin — მომხმარებელი",
          createdTabTitle: "ბოლო 10 დადებული დავალება",
          takenTabTitle: "ბოლო დავალებები (აღებული / მოთხოვნები)",
          createdEmpty: "ამ მომხმარებელს ჯერ არაფერი დაუდია.",
          takenEmpty: "ამ მომხმარებელს ჯერ არაფერი აუღია და არც მოთხოვნები აქვს.",
          details: "დეტალები",
          takenPending: "ელოდება დამკვეთის დასტურს",
          takenRejected: "მოთხოვნა უარყოფილია",
          takenApproved: "დადასტურებულია",
        }
      : {
          pageTitle: "Admin — User",
          createdTabTitle: "Last 10 created tasks",
          takenTabTitle: "Recent tasks (taken / applications)",
          createdEmpty: "This user has not created any tasks yet.",
          takenEmpty: "This user has no taken tasks or applications.",
          details: "Details",
          takenPending: "Waiting for client's approval",
          takenRejected: "Application rejected",
          takenApproved: "Approved",
        };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/users/${id}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || "Load failed");
        }
        if (!cancelled) {
          setData(json as Payload);
          setCommissionDraft(String(json.user.commissionPct));
          setErr(null);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const user = data?.user;
  const stats = data?.stats;

  function openTask(taskId: string) {
    setSelectedTaskId(taskId);
  }

async function saveCommission() {
  if (!user) return;
  const val = Number(commissionDraft);
  if (!Number.isFinite(val)) {
    setErr('საკომისიო უნდა იყოს რიცხვი');
    return;
  }
  setSavingPct(true);
  setPctSavedMsg(null);
  try {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commissionPct: val }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || 'Save failed');
    }

    // განვაახლოთ ლოკალური user-იც
    setData((prev) =>
      prev
        ? { ...prev, user: { ...prev.user, commissionPct: json.commissionPct } }
        : prev,
    );
    setErr(null);
    setPctSavedMsg('საკომისიო წარმატებით შეიცვალა'); // ✅ success მესიჯი
  } catch (e: any) {
    setErr(e?.message || 'Save failed');
    setPctSavedMsg(null);
  } finally {
    setSavingPct(false);
  }
}


  function toTaskCardInput(tk: TaskCardPayload): TaskCardInput {
    return {
      id: tk.id,
      locale, // Admin გვერდის ენა
      title: tk.title,
      desc: tk.desc ?? "",
      category: tk.category ?? undefined,
      skill: tk.skill ?? undefined,
      reward: tk.reward,
      deadline: tk.deadline,
      where: tk.where as TaskCardInput["where"],
      exclusive: tk.exclusive,
      status: tk.status,
    };
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">{t.pageTitle}</h1>
        <div className="card p-6 text-sm text-white/70">
          {locale === "ka" ? "იტვირთება პროფილი..." : "Loading profile..."}
        </div>
      </div>
    );
  }

  if (err || !user || !stats) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">{t.pageTitle}</h1>
        <div className="card p-6 text-sm text-red-400">
          შეცდომა პროფილის ჩატვირთვისას: {err || "unknown_error"}
        </div>
      </div>
    );
  }

  const createdAt = new Date(user.createdAt).toLocaleDateString(
    locale === "ka" ? "ka-GE" : "en-US"
  );
  const initial = (user.name?.[0] || user.email[0] || "?").toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-lg font-semibold">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || user.email}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold">
              {user.name || user.email.split("@")[0]}
            </h1>
            <p className="text-sm text-white/60">
              {user.email}
              {user.phone && (
                <>
                  {" · "}
                  <span>{user.phone}</span>
                </>
              )}
            </p>
            <p className="text-xs text-white/40">
              {locale === "ka" ? "რეგისტრაცია" : "Registered"}: {createdAt}
            </p>
          </div>
        </div>

        {/* ძირითადი სტატისტიკა */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="card px-4 py-2 text-center">
            <div className="text-white/60">
              {locale === "ka" ? "დადებული დავალებები" : "Tasks posted"}
            </div>
            <div className="text-lg font-semibold">{stats.tasksPosted}</div>
          </div>
          <div className="card px-4 py-2 text-center">
            <div className="text-white/60">
              {locale === "ka" ? "აღებული დავალებები" : "Tasks taken"}
            </div>
            <div className="text-lg font-semibold">{stats.tasksTaken}</div>
          </div>
          <div className="card px-4 py-2 text-center">
            <div className="text-white/60">
              {locale === "ka"
                ? "შესრულებული (როგორც worker)"
                : "Completed (as worker)"}
            </div>
            <div className="text-lg font-semibold">
              {stats.completedTasks}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 text-sm">
        {[
          { id: "overview", label: locale === "ka" ? "პროფილი" : "Profile" },
          { id: "created", label: locale === "ka" ? "დადებული" : "Created" },
          { id: "taken", label: locale === "ka" ? "აღებული" : "Taken" },
          { id: "analytics", label: locale === "ka" ? "ანალიტიკა" : "Analytics" },
        ].map((it) => (
          <button
            key={it.id}
            onClick={() => setTab(it.id as Tab)}
            className={`rounded-full px-4 py-2 border text-xs transition ${
              tab === it.id
                ? "border-cyan-400 bg-cyan-400/20 text-cyan-100"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>

      {/* Tab: overview */}
      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4 text-sm space-y-2">
            <h2 className="font-semibold mb-2">
              {locale === "ka" ? "პირადი ინფორმაცია" : "Personal info"}
            </h2>
            <div>ელ. ფოსტა: {user.email}</div>
            <div>ტელეფონი: {user.phone || "—"}</div>
            <div>საკომისიო: {user.commissionPct}%</div>
          </div>

          <div className="card p-4 text-sm space-y-2">
            <h2 className="font-semibold mb-2">
              {locale === "ka" ? "რეიტინგები" : "Ratings"}
            </h2>
            <div>
              {locale === "ka" ? "როგორც შემსრულებელი" : "As worker"}:{" "}
              {user.ratingWorkerAvg.toFixed(1)} ★ ({user.ratingWorkerCount})
            </div>
            <div>
              {locale === "ka" ? "როგორც დამქირავებელი" : "As client"}:{" "}
              {user.ratingClientAvg.toFixed(1)} ★ ({user.ratingClientCount})
            </div>
          </div>
        </div>
      )}

      {/* Tab: created */}
      {tab === "created" && (
        <div className="text-sm">
          <div className="mb-3 text-white/70">{t.createdTabTitle}</div>

          {data!.createdTasks.length === 0 ? (
            <div className="text-center text-white/40 py-4">
              {t.createdEmpty}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data!.createdTasks.map((tk) => (
                <TaskCard
                  key={tk.id}
                  task={toTaskCardInput(tk)}
                  ctaLabel={t.details}
                  onOpenTask={openTask}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: taken */}
      {tab === "taken" && (
        <div className="text-sm">
          <div className="mb-3 text-white/70">{t.takenTabTitle}</div>

          {data!.takenItems.length === 0 ? (
            <div className="text-center text-white/40 py-4">
              {t.takenEmpty}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data!.takenItems.map((item, idx) => {
                const task = toTaskCardInput(item.task);
                let badge;
                if (item.flag === "pending") {
                  badge = { kind: "pending" as const, text: t.takenPending };
                } else if (item.flag === "rejected") {
                  badge = {
                    kind: "rejected" as const,
                    text: t.takenRejected,
                  };
                } else if (item.flag === "approved") {
                  badge = {
                    kind: "approved" as const,
                    text: t.takenApproved,
                  };
                } else {
                  badge = undefined;
                }

                return (
                  <TaskCard
                    key={task.id + "-" + idx}
                    task={task}
                    statusBadge={badge}
                    ctaLabel={t.details}
                    onOpenTask={openTask}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: analytics */}
      {tab === "analytics" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4 text-sm space-y-2">
            <h2 className="font-semibold mb-2">
              {locale === "ka" ? "ფულადი ნაკადები" : "Money flow"}
            </h2>
            <div>
              {locale === "ka" ? "სულ გამოიმუშავა" : "Total earned"}:{" "}
              {stats.earnedTotal} ₾
            </div>
            <div>
              {locale === "ka" ? "სულ დახარჯა" : "Total spent"}:{" "}
              {stats.spentTotal} ₾
            </div>
          </div>

          <div className="card p-4 text-sm space-y-3">
            <h2 className="font-semibold mb-2">
              {locale === "ka" ? "საკომისიო" : "Commission"}
            </h2>
            <p className="text-white/60 text-xs">
              {locale === "ka"
                ? "აქედანვე შეგიძლია კონკრეტული მომხმარებლის საკომისიო შეცვალო."
                : "You can change this user's commission here."}
            </p>
  <div className="flex flex-col gap-2">
  <div className="flex items-center gap-2">
    <input
      type="number"
      min={0}
      max={100}
      value={commissionDraft}
      onChange={(e) => setCommissionDraft(e.target.value)}
      className="w-20 rounded-md bg-black/40 border border-white/20 px-2 py-1 text-xs outline-none"
    />
    <span className="text-xs text-white/60">%</span>

    {/* ლამაზად გამოკვეთილი გლიჩ-ღილაკი */}
    <button
      onClick={saveCommission}
      disabled={savingPct}
      className="btn-hero-secondary text-xs disabled:opacity-60"
      data-text={savingPct ? 'შენახვა...' : 'შეცვლა'}
    >
      <span className="btn-text">
        {savingPct ? 'შენახვა...' : 'შეცვლა'}
      </span>
    </button>
  </div>

  {/* success მესიჯი */}
  {pctSavedMsg && (
    <div className="text-xs text-emerალდ-400">
      {pctSavedMsg}
    </div>
  )}
</div>

          </div>
        </div>
      )}

      {err && (
        <div className="card p-3 text-xs text-red-400">
          შეცდომა: {err}
        </div>
      )}

      {/* Task modal – admin read-only ვერსია */}
      <TaskModal
        open={!!selectedTaskId}
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        readOnly={true}
      />
    </div>
  );
}
