"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  CalendarClock,
  MapPin,
  Medal,
  Sparkles,
  Lock,
  X,
  User2,
  Image as ImageIcon,
  Mail,
  Phone,
  Star,
  RotateCcw,
  Send,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import MatrixLoader from "@/components/MatrixLoader";

/* ---------- Types ---------- */
type TaskResp = {
  id: string;
  authorId: string;
  isMine: boolean;

  // ✅ from server (preferred)
  isExpired?: boolean;

  hasTakenByMe?: boolean;
  myAppStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  myThreadId?: string | null;

  locale: "ka" | "en";
  title: string;
  desc: string;
  category: string;
  skill: "BEGINNER" | "INTERMEDIATE" | "EXPERT" | string;
  reward: number;
  deadline: string | null;
  where: "REMOTE" | "ONSITE";
  address: string | null;
  exclusive: boolean;
  status: "DRAFT" | "PUBLISHED";
  photos: string[];
  proof: string;
};

type OwnerInfo = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
};

type OutgoingEvidenceMini = {
  id: string;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_FIXES" | "EXPIRED";
  task?: { id: string };
};

/* ---------- i18n ---------- */
const dict = {
  ka: {
    loading: "იტვირთება…",
    postedBy: "გამომქვეყნებელი",
    description: "აღწერა",
    deliverables: "დელივერებლები / სამტკიცებითი მასალა",
    attachments: "ფოტოები",
    category: "კატეგორია",
    skill: "უნარი",
    type: "ტიპი",
    remote: "დისტანციური",
    onsite: "ადგილზე",
    address: "მისამართი",
    deadline: "დედლაინი",
    exclusive: "ექსკლუზიური",
    yes: "დიახ",
    no: "არა",
    close: "დახურვა",
    takeTask: "დავალების აღება",
    taking: "იღებთ…",
    cannotTakeOwn: "საკუთარი შექმნილი დავალების აღება შეუძლებელია",
    alreadyTaken: "ეს დავალება უკვე აღებული გაქვთ",
    notPublished: "ეს დავალება გამოქვეყნებული არ არის",
    takeSuccess: "დავალება წარმატებით აიღეთ!",
    returnedOk: "დავალება დაბრუნდა.",
    returning: "ვაბრუნებთ…",
    submitProof: "მტკიცებულებების გაგზავნა",
    returnTask: "დავალების დაბრუნება",
    open: "ღია",
    due: "დარჩა",
    days: "დღე",
    hours: "სთ",
    email: "მეილი",
    mobile: "მობილური",
    rating: "შეფასება (დამკვეთი)",
    of: "დან",
    applyTitle: "მოთხოვნის გაგზავნა",
    applyHint:
      "სავალდებულო არაა, მაგრამ რეკომენდებულია — მოკლედ დაწერე რატომ ხარ საუკეთესო ამ დავალებისთვის.",
    optional: "არასავალდებულო",
    send: "გაგზავნა",
    sending: "იგზავნება…",
    sent: "მოთხოვნა გაიგზავნა!",
    goToChat: "გადადი ჩატში",
    cancel: "გაუქმება",
    openChat: "ჩატის გახსნა",
    awaitingApproval: "ჯერ ელოდებით დამკვეთის დადასტურებას.",
    chatUnavailable: "ჩატი ჯერ არ არის ხელმისაწვდომი.",
    rejectedBadge: "თქვენი მოთხოვნა უარყოფილია",
    proofSent: "მტკიცებულებები გაგზავნილია, ელოდებით დამკვეთის პასუხს.",
    cannotReturnAfterEvidence:
      "უკვე გაგზავნილია მტკიცებულება. სანამ დამკვეთი პასუხს არ გასცემს, დავალების დაბრუნება შეუძლებელია.",
    resubmitProof: "მტკიცებულებების ხელახლა გაგზავნა",
    proofNeedsFixes: "დამკვეთმა დაახარვეზა — საჭიროა ხელახლა გაგზავნა.",

    expired: "ვადაგასულია",
    expiredHint: "დედლაინი გასულია. ახალი შესრულება/აღება შეჩერებულია.",

    deleteTask: "წაშლა",
    deleting: "იშლება…",
    deleteConfirm:
      "დარწმუნებული ხართ თუ არა რომ გნებავთ წაშლა?\nწაშლის შემთხვევაში თანხა დაგიბრუნდებათ ბალანსზე",
    deleteBlocked:
      "წაშლა ვერ მოხერხდა: დავალებაზე არსებობს აქტიური პროცესი (აღება/მტკიცებულებები/აპლიკაციები).",

    approvalReceived: "თანხმობა მიღებულია",

    // ✅ new for extend deadline
    extendDeadline: "დედლაინის გახანგრძლივება",
    extendTitle: "დედლაინის გახანგრძლივება",
    chooseDeadline: "აირჩიე ახალი დედლაინი",
    minTomorrow: "მინიმუმ ხვალინდელი დღე",
    save: "შენახვა",
    saving: "ინახება…",
    deadlineUpdated: "დედლაინი განახლდა.",
    invalidDeadline: "გთხოვ აირჩიე სწორი თარიღი (მინიმუმ ხვალ).",
  },
  en: {
    loading: "Loading…",
    postedBy: "Posted by",
    description: "Description",
    deliverables: "Deliverables / Evidence",
    attachments: "Attachments",
    category: "Category",
    skill: "Skill",
    type: "Type",
    remote: "Remote",
    onsite: "On-site",
    address: "Address",
    deadline: "Deadline",
    exclusive: "Exclusive",
    yes: "Yes",
    no: "No",
    close: "Close",
    takeTask: "Take task",
    taking: "Taking…",
    cannotTakeOwn: "You can’t take your own task",
    alreadyTaken: "You already took this task",
    notPublished: "This task is not published",
    takeSuccess: "You successfully took the task!",
    returnedOk: "Task has been returned.",
    returning: "Returning…",
    submitProof: "Submit Evidence",
    returnTask: "Return Task",
    open: "Open",
    due: "Due in",
    days: "day(s)",
    hours: "hour(s)",
    email: "Email",
    mobile: "Mobile",
    rating: "Rating (client)",
    of: "of",
    applyTitle: "Send Application",
    applyHint:
      "Optional but recommended — write a short note to the client why you’re a good fit.",
    optional: "optional",
    send: "Send",
    sending: "Sending…",
    sent: "Application sent!",
    goToChat: "Open chat",
    cancel: "Cancel",
    openChat: "Open chat",
    awaitingApproval: "Waiting for the client's approval.",
    chatUnavailable: "Chat is not available yet.",
    rejectedBadge: "Your application was rejected",
    proofSent: "Evidence sent, awaiting client's response.",
    cannotReturnAfterEvidence:
      "You have already submitted evidence. Until the client responds, you cannot return this task.",
    resubmitProof: "Resubmit evidence",
    proofNeedsFixes: "Client requested fixes — please resubmit.",

    expired: "Expired",
    expiredHint: "Deadline has passed. New actions are disabled.",

    deleteTask: "Delete",
    deleting: "Deleting…",
    deleteConfirm:
      "Are you sure you want to delete?\nIf deleted, the amount will be returned to your balance.",
    deleteBlocked:
      "Delete failed: there is an active process (claims/evidence/applications) on this task.",

    approvalReceived: "Approval received",

    // ✅ new for extend deadline
    extendDeadline: "Extend deadline",
    extendTitle: "Extend deadline",
    chooseDeadline: "Choose new deadline",
    minTomorrow: "Minimum is tomorrow",
    save: "Save",
    saving: "Saving…",
    deadlineUpdated: "Deadline updated.",
    invalidDeadline: "Please choose a valid date (minimum tomorrow).",
  },
} as const;

/* ---------- label mappers ---------- */
const categoryLabel = (raw: string | undefined | null, loc: "ka" | "en") => {
  const k = String(raw || "").toLowerCase();
  const map = {
    ka: { content: "კონტენტი", design: "დიზაინი", development: "დეველოპმენტი" },
    en: { content: "Content", design: "Design", development: "Development" },
  } as const;
  if (k.includes("content")) return map[loc].content;
  if (k.includes("design")) return map[loc].design;
  if (k.includes("develop")) return map[loc].development;
  return raw || "—";
};

const skillLabel = (raw: string | undefined | null, loc: "ka" | "en") => {
  const k = String(raw || "").toUpperCase();
  const map = {
    ka: { BEGINNER: "დამწყები", INTERMEDIATE: "საშუალო", EXPERT: "ექსპერტი" },
    en: { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", EXPERT: "Expert" },
  } as const;
  if ((map as any)[loc][k]) return (map as any)[loc][k];
  return raw || "—";
};

function fmtDeadlineLabel(deadline: string | null, t: { days: string; hours: string }) {
  if (!deadline) return "—";
  const dt = new Date(deadline);
  if (Number.isNaN(dt.getTime())) return "—";
  const ms = dt.getTime() - Date.now();
  if (ms <= 0) return "0";
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `${days} ${t.days}`;
  const hours = Math.ceil(ms / 3600000);
  return `${hours} ${t.hours}`;
}

function StarRow({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, value));
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const filled = n <= Math.round(v);
        return (
          <Star
            key={n}
            className={`w-4 h-4 ${filled ? "fill-yellow-400 text-yellow-400" : "text-white/40"}`}
          />
        );
      })}
    </div>
  );
}

/* ---------- helpers ---------- */
const getUidFromCookie = () => {
  if (typeof document === "undefined") return "guest";
  const m = document.cookie.match(/(?:^|;\s*)x-user-id=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "guest";
};
const getEmailFromCookie = () => {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)email=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
};

function isExpiredTask(deadline: string | null) {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function toYmdLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfTomorrowLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

function deadlineIsoFromYmd(ymd: string) {
  // Save as end-of-day local to be forgiving for users
  const dt = new Date(`${ymd}T23:59:59`);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

/* ---------- Component ---------- */
export default function TaskModal({
  open,
  taskId,
  onClose,
  readOnly = false,
}: {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
  readOnly?: boolean;
}) {
  const params = useParams<{ locale?: string }>();
  const locale = (params?.locale === "en" ? "en" : "ka") as "ka" | "en";
  const t = dict[locale];
  const router = useRouter();

  const openFloatingChat = (tid?: string | null) => {
    if (!tid) {
      alert(t.chatUnavailable);
      return;
    }
    try {
      localStorage.setItem("chat:openThread", tid);
      window.dispatchEvent(new CustomEvent("open-chat"));
      onClose();
    } catch {
      window.location.href = `/${locale}/chats/${tid}`;
    }
  };

  const [data, setData] = useState<TaskResp | null>(null);
  const [owner, setOwner] = useState<OwnerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [taking, setTaking] = useState(false);
  const [returning, setReturning] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [hasTaken, setHasTaken] = useState(false);

  const [appStatus, setAppStatus] =
    useState<"NONE" | "PENDING" | "APPROVED" | "REJECTED">("NONE");
  const [threadId, setThreadId] = useState<string | null>(null);

  const [evidenceApproved, setEvidenceApproved] = useState(false);
  const [evidenceStatus, setEvidenceStatus] = useState<
    "NONE" | "PENDING" | "APPROVED" | "NEEDS_FIXES" | "REJECTED" | "EXPIRED"
  >("NONE");
  const [needsFixesEvidenceId, setNeedsFixesEvidenceId] = useState<string | null>(null);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyMsg, setApplyMsg] = useState("");
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyErr, setApplyErr] = useState<string | null>(null);
  const [applyDone, setApplyDone] = useState<{ threadId: string } | null>(null);

  const [evidenceLoading, setEvidenceLoading] = useState(false);

  const [deleting, setDeleting] = useState(false);

  // ✅ extend deadline popup
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDate, setExtendDate] = useState<string>("");
  const [extendBusy, setExtendBusy] = useState(false);
  const [extendErr, setExtendErr] = useState<string | null>(null);

  const hasEvidencePending = evidenceStatus === "PENDING";

  const closeApply = () => {
    setApplyOpen(false);
    setApplyErr(null);
    setApplyBusy(false);
    setApplyMsg("");
  };

  const closeExtend = () => {
    setExtendOpen(false);
    setExtendErr(null);
    setExtendBusy(false);
  };

  // reset per-open
  useLayoutEffect(() => {
    if (!open) return;

    setData(null);
    setOwner(null);

    setErr(null);
    setMsg(null);

    setTaking(false);
    setReturning(false);

    setApplyOpen(false);
    setApplyDone(null);
    setApplyErr(null);
    setApplyMsg("");
    setApplyBusy(false);

    setAppStatus("NONE");
    setThreadId(null);
    setHasTaken(false);

    setEvidenceApproved(false);
    setEvidenceStatus("NONE");
    setNeedsFixesEvidenceId(null);
    setEvidenceLoading(true);

    setDeleting(false);

    setExtendOpen(false);
    setExtendDate("");
    setExtendBusy(false);
    setExtendErr(null);

    setLoading(true);
  }, [open, taskId]);

  // load outgoing evidences (worker)
  useEffect(() => {
    if (!open || !taskId) return;
    let alive = true;

    setEvidenceLoading(true);

    fetch(`/api/my/evidences?tab=outgoing`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: OutgoingEvidenceMini[]) => {
        if (!alive) return;

        const mine = Array.isArray(list) ? list.filter((ev) => ev?.task?.id === taskId) : [];
        const latest =
          mine
            .slice()
            .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0] || null;

        const st = (latest?.status || "NONE") as any;
        setEvidenceStatus(st);

        setEvidenceApproved(st === "APPROVED");
        setNeedsFixesEvidenceId(st === "NEEDS_FIXES" && latest ? latest.id : null);

        setEvidenceLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setEvidenceApproved(false);
        setEvidenceStatus("NONE");
        setNeedsFixesEvidenceId(null);
        setEvidenceLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open, taskId]);

  // load task
  useEffect(() => {
    if (!open || !taskId) return;
    let alive = true;

    setErr(null);
    setMsg(null);

    const uid = getUidFromCookie();
    fetch(`/api/tasks/${taskId}`, {
      cache: "no-store",
      headers: { "x-user-id": uid, "x-email": getEmailFromCookie() },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || "Request failed");
        return r.json() as Promise<TaskResp>;
      })
      .then((j) => {
        if (!alive) return;
        setData(j);
        setHasTaken(!!j.hasTakenByMe);
        setAppStatus(j.myAppStatus ?? "NONE");
        setThreadId(j.myThreadId ?? null);

        // prefill extend date (tomorrow or current deadline if >= tomorrow)
        const tomorrow = startOfTomorrowLocal();
        const cur = j.deadline ? new Date(j.deadline) : null;
        const initial =
          cur && !Number.isNaN(cur.getTime()) && cur.getTime() >= tomorrow.getTime()
            ? toYmdLocal(cur)
            : toYmdLocal(tomorrow);
        setExtendDate(initial);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(String((e as any).message || e));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open, taskId]);

  // owner info
  useEffect(() => {
    let alive = true;
    async function loadOwner() {
      if (!open || !data?.authorId) return;
      try {
        const r = await fetch(`/api/users/${data.authorId}`, { cache: "no-store" });
        if (!r.ok) throw new Error("no_user");
        const u: any = await r.json();
        if (!alive) return;
        setOwner({
          name: u.name || (u.email ? String(u.email).split("@")[0] : null),
          email: u.email || null,
          phone: u.phone || null,
          avatar: u.image || null,
          ratingAvg: u.ratingClientAvg ?? 0,
          ratingCount: u.ratingClientCount ?? 0,
        });
      } catch {
        if (!alive) return;
        setOwner({
          name: data!.authorId,
          email: null,
          phone: null,
          avatar: null,
          ratingAvg: 0,
          ratingCount: 0,
        });
      }
    }
    loadOwner();
    return () => {
      alive = false;
    };
  }, [open, data?.authorId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (extendOpen) closeExtend();
        else if (applyOpen) closeApply();
        else onClose();
      }
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, applyOpen, extendOpen, onClose]);

  if (!open) return null;

  const mismatch = !!data && !!taskId && data.id !== taskId;
  if (loading || evidenceLoading || mismatch) {
    return (
      <div className="fixed inset-0 z-[2147483648]">
        <MatrixLoader />
      </div>
    );
  }

  // ✅ server-first expired, fallback to client calc
  const expired = Boolean(data?.isExpired ?? isExpiredTask(data?.deadline ?? null));

  async function handleTake() {
    if (!data) return;

    if (!data.isMine && expired) {
      setMsg(null);
      setErr(t.expiredHint);
      return;
    }

    setTaking(true);
    setErr(null);
    setMsg(null);
    const uid = getUidFromCookie();
    try {
      const r = await fetch(`/api/tasks/${data.id}/take`, {
        method: "POST",
        headers: { "x-user-id": uid, "x-email": getEmailFromCookie() },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const code = j?.error || "Request failed";
        if (code === "Cannot take own task") setErr(t.cannotTakeOwn);
        else if (code === "Already taken") {
          setErr(null);
          setHasTaken(true);
          setMsg(t.alreadyTaken);
        } else if (code === "Task is not published") setErr(t.notPublished);
        else setErr(code);
        return;
      }
      setMsg(t.takeSuccess);
      setHasTaken(true);
    } catch (e: any) {
      setErr(String(e?.message || e) || "Failed");
    } finally {
      setTaking(false);
    }
  }

  async function handleReturn() {
    if (!data) return;
    setReturning(true);
    setErr(null);
    setMsg(null);
    const uid = getUidFromCookie();
    try {
      const r = await fetch(`/api/tasks/${data.id}/take`, {
        method: "DELETE",
        headers: { "x-user-id": uid, "x-email": getEmailFromCookie() },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error || "Request failed");
        return;
      }
      setHasTaken(false);
      setMsg(t.returnedOk);
    } catch (e: any) {
      setErr(String(e?.message || e) || "Failed");
    } finally {
      setReturning(false);
    }
  }

  const handleReturnClick = () => {
    if (!data) return;
    if (hasEvidencePending) {
      setMsg(null);
      setErr(t.cannotReturnAfterEvidence);
      return;
    }
    if (returning) return;
    void handleReturn();
  };

  async function submitApplication() {
    if (!data) return;

    if (!data.isMine && expired) {
      setApplyErr(t.expiredHint);
      return;
    }

    setApplyBusy(true);
    setApplyErr(null);
    const uid = getUidFromCookie();
    try {
      const r = await fetch(`/api/tasks/${data.id}/apply`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user-id": uid,
          "x-email": getEmailFromCookie(),
        },
        body: JSON.stringify({ message: applyMsg }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setApplyErr(String(j?.error || "Request failed"));
        return;
      }
      const tid: string | undefined = j?.thread?.id;
      setApplyDone({ threadId: tid || "" });
      setAppStatus("PENDING");
      setThreadId(tid || null);
    } catch (e: any) {
      setApplyErr(String(e?.message || e) || "Failed");
    } finally {
      setApplyBusy(false);
    }
  }

  const handleSubmitProof = () => {
    if (!data?.id) return;

    if (!data.isMine && expired) {
      setMsg(null);
      setErr(t.expiredHint);
      return;
    }

    const href = `/${locale}/mypage/proofs/submit?task=${data.id}`;
    onClose();
    setTimeout(() => router.push(href), 0);
  };

  const handleResubmitProof = () => {
    if (!data?.id) return;
    if (!needsFixesEvidenceId) return;

    if (!data.isMine && expired) {
      setMsg(null);
      setErr(t.expiredHint);
      return;
    }

    const href = `/${locale}/mypage/proofs/submit?task=${data.id}&fixFor=${needsFixesEvidenceId}`;
    onClose();
    setTimeout(() => router.push(href), 0);
  };

  const deleteMine = async () => {
    if (!data?.id) return;
    if (deleting) return;

    const ok = window.confirm(t.deleteConfirm);
    if (!ok) return;

    setDeleting(true);
    setErr(null);
    setMsg(null);

    try {
      const r = await fetch(`/api/tasks/${data.id}`, {
        method: "DELETE",
        headers: { "x-user-id": getUidFromCookie(), "x-email": getEmailFromCookie() },
      });
      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        const code = String(j?.error || "delete_failed");
        if (
          code === "has_claims" ||
          code === "has_active_evidences" ||
          code === "has_applications" ||
          code === "has_approved_application" ||
          code === "has_approved_evidence"
        ) {
          setErr(t.deleteBlocked);
        } else {
          setErr(code);
        }
        setDeleting(false);
        return;
      }

      setMsg(locale === "ka" ? "წაშლილია." : "Deleted.");
      onClose();
      setTimeout(() => router.refresh(), 0);
    } catch (e: any) {
      setErr(String(e?.message || e) || "Failed");
      setDeleting(false);
    }
  };

  const openExtend = () => {
    if (!data?.isMine) return;

    const tomorrow = startOfTomorrowLocal();
    const cur = data.deadline ? new Date(data.deadline) : null;
    const initial =
      cur && !Number.isNaN(cur.getTime()) && cur.getTime() >= tomorrow.getTime()
        ? toYmdLocal(cur)
        : toYmdLocal(tomorrow);

    setExtendDate(initial);
    setExtendErr(null);
    setExtendBusy(false);
    setExtendOpen(true);
  };

  const saveExtendedDeadline = async () => {
    if (!data?.id) return;

    const minYmd = toYmdLocal(startOfTomorrowLocal());
    if (!extendDate || extendDate < minYmd) {
      setExtendErr(t.invalidDeadline);
      return;
    }

    const iso = deadlineIsoFromYmd(extendDate);
    if (!iso) {
      setExtendErr(t.invalidDeadline);
      return;
    }

    setExtendBusy(true);
    setExtendErr(null);
    setErr(null);
    setMsg(null);

    try {
      const r = await fetch(`/api/tasks/${data.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-user-id": getUidFromCookie(),
          "x-email": getEmailFromCookie(),
        },
        body: JSON.stringify({ deadline: iso }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setExtendErr(String(j?.error || "Request failed"));
        setExtendBusy(false);
        return;
      }
const newDeadline = (j?.deadline as string | null) ?? iso;
const newIsExpired = typeof j?.isExpired === "boolean" ? j.isExpired : false;

// ✅ Update local task state using server response
setData((prev) =>
  prev
    ? {
        ...prev,
        deadline: newDeadline,
        isExpired: newIsExpired,
      }
    : prev
);

setMsg(t.deadlineUpdated);
setExtendOpen(false);


      // refresh tasky list / any cache
      setTimeout(() => router.refresh(), 0);
    } catch (e: any) {
      setExtendErr(String(e?.message || e) || "Failed");
    } finally {
      setExtendBusy(false);
    }
  };

  const badge =
    data?.status === "PUBLISHED" ? (
      <span className="px-3 py-1 rounded-full bg-emerald-400/15 text-emerald-300 text-sm ring-1 ring-emerald-400/40">
        {t.open}
      </span>
    ) : null;

  const duePill = data?.deadline ? (
    <span
      className={`px-3 py-1 rounded-full text-sm ring-1 ${
        expired ? "bg-red-500/10 text-red-300 ring-red-400/30" : "bg-sky-400/15 text-sky-300 ring-sky-400/40"
      }`}
      title={expired ? t.expired : undefined}
    >
      {expired ? t.expired : `${t.due} ${fmtDeadlineLabel(data.deadline, t)}`}
    </span>
  ) : null;

  const closeLabel = t.close;
  const takeLabel = taking ? t.taking : t.takeTask;
  const returnLabel = returning ? t.returning : t.returnTask;

  const submitProofLabel = t.submitProof;
  const submitProofDisabledLabel = t.proofSent;
  const openChatLabel = t.openChat;

  const applyLabel = t.takeTask;
  const cancelLabel = t.cancel;
  const sendLabel = applyBusy ? t.sending : t.send;

  const showExpiredBanner = !!data && !data.isMine && expired;

  return (
    <div className="fixed inset-0 z-[2147483648]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm modal-overlay" onClick={onClose} />
      <div className="absolute inset-x-0 top-8 mx-auto w-[min(100%,1100px)]">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tasky-modal-title"
          className="relative rounded-2xl ring-1 ring-cyan/30 bg-[#0b0f16]/95 shadow-[0_0_40px_rgba(0,255,255,.15)] tasky-modal max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 md:p-6 border-b border-white/10">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <h2 id="tasky-modal-title" className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {data?.title}
                </h2>

                {data && (
                  <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                    <span className="px-3 py-1 rounded-full bg-cyan/20 text-cyan font-semibold shadow-neon">
                      ₾{data.reward}
                    </span>
                    {badge}
                    {duePill}
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {showExpiredBanner && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-500/10 ring-1 ring-red-400/20 p-3 text-sm text-red-200">
                <AlertTriangle className="w-4 h-4 mt-0.5" />
                <div>{t.expiredHint}</div>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-5 md:p-6 grid lg:grid-cols-[1.65fr,1fr] gap-6">
              {/* Left */}
              <div className="space-y-4">
                <div className="card p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <div className="font-semibold mb-2">{t.description}</div>
                  <div className="text-white/80 whitespace-pre-wrap leading-relaxed">{data?.desc || "—"}</div>
                </div>

                <div className="card p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <div className="font-semibold mb-2">{t.deliverables}</div>
                  <div className="text-white/80 text-sm">
                    {data?.proof ? (
                      <ul className="list-disc list-inside space-y-1">
                        {data.proof.split("\n").map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <div>—</div>
                    )}
                  </div>
                </div>

                {!!data?.photos?.length && (
                  <div className="card p-0 bg-white/5 ring-1 ring-white/10 rounded-2xl">
                    <div className="px-4 py-3 flex items-center gap-2 border-b border-white/10">
                      <ImageIcon className="w-4 h-4 text-cyan" />
                      <div className="font-semibold">{t.attachments}</div>
                    </div>
                    <div className="p-3 grid grid-cols-3 md:grid-cols-4 gap-3">
                      {data.photos.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="block group relative w-full rounded-lg ring-1 ring-white/10 bg-black/30 p-2 h-20 md:h-24"
                          title={`photo-${i + 1}`}
                        >
                          <img
                            src={src}
                            alt={`photo-${i + 1}`}
                            className="block w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right */}
              <aside className="space-y-4">
                <div className="card p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center ring-1 ring-white/15 overflow-hidden">
                      {owner?.avatar ? (
                        <img src={owner.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User2 className="w-6 h-6 text-white/70" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{owner?.name || data?.authorId}</div>
                      {owner?.email && (
                        <div className="text-white/60 text-sm truncate flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {owner.email}
                        </div>
                      )}
                      {owner?.phone && (
                        <div className="text-white/60 text-sm truncate flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {owner.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-white/70">{t.rating}</div>
                    <div className="flex items-center gap-2">
                      <StarRow value={owner?.ratingAvg || 0} />
                      <div className="text-white/70 text-sm">
                        {(owner?.ratingAvg ?? 0)} / 5 • {(owner?.ratingCount ?? 0)} {t.of}
                      </div>
                    </div>
                  </div>
                </div>

                {data && (
                  <div className="card p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-fuchsia-400" />
                        <div className="text-white/60">{t.category}</div>
                      </div>
                      <div className="text-white/80">{categoryLabel(data.category, locale)}</div>

                      <div className="flex items-center gap-2">
                        <Medal className="w-4 h-4 text-amber-400" />
                        <div className="text-white/60">{t.skill}</div>
                      </div>
                      <div className="text-white/80">{skillLabel(data.skill, locale)}</div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose-400" />
                        <div className="text-white/60">{locale === "ka" ? "ლოკაცია" : "Location"}</div>
                      </div>
                      <div className="text-white/80">{data.where === "REMOTE" ? t.remote : t.onsite}</div>

                      {data.where === "ONSITE" && (
                        <>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-rose-400" />
                            <div className="text-white/60">{t.address}</div>
                          </div>
                          <div className="text-white/80">{data.address || "—"}</div>
                        </>
                      )}

                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-sky-400" />
                        <div className="text-white/60">{t.deadline}</div>
                      </div>
                      <div className="text-white/80">
                        {data.deadline
                          ? new Date(data.deadline).toLocaleDateString(locale === "ka" ? "ka-GE" : "en-US")
                          : "—"}
                      </div>

                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-yellow-300" />
                        <div className="text-white/60">{t.type}</div>
                      </div>
                      <div className="text-white/80">
                        {data.exclusive ? (
                          <span className="px-2 py-0.5 rounded-md border border-yellow-400/70 bg-yellow-400/10 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.2)]">
                            {locale === "ka" ? "ექსკლუზიური" : "Exclusive"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md border border-white/15 text-white/70 bg-white/5">
                            {locale === "ka" ? "არაექსკლუზიური" : "Multi"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            </div>

            {(err || msg) && (
              <div className="px-5 md:px-6 pb-4">
                {err && <div className="p-3 rounded-xl bg-red-500/10 text-red-300 text-sm">{err}</div>}
                {msg && <div className="mt-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-300 text-sm">{msg}</div>}
              </div>
            )}
          </div>

          {/* Footer */}
          {readOnly ? (
            <div className="sticky bottom-0 p-5 md:p-6 pt-3 flex justify-end border-t border-white/10 bg-[#0b0f16]/95 backdrop-blur-sm">
              <button onClick={onClose} className="btn-modal-close text-sm" data-text={closeLabel}>
                <span className="btn-text">{closeLabel}</span>
              </button>
            </div>
          ) : (
            <>
              <div className="sticky bottom-0 p-4 md:p-6 pt-3 flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 border-t border-white/10 bg-[#0b0f16]/95 backdrop-blur-sm">
                <button onClick={onClose} className="btn-modal-close text-sm" data-text={closeLabel}>
                  <span className="btn-text">{closeLabel}</span>
                </button>

                {/* Owner controls */}
                {data?.isMine && (
                  <>
                    <button
                      onClick={openExtend}
                      className="btn-hero-secondary text-sm inline-flex items-center gap-2"
                      data-text={t.extendDeadline}
                    >
                      <CalendarClock className="w-4 h-4" />
                      <span className="btn-text">{t.extendDeadline}</span>
                    </button>

                    <button
                      onClick={deleteMine}
                      disabled={deleting}
                      className="btn-logout btn-no-glitch inline-flex items-center gap-2 text-sm disabled:opacity-60"
                      title={t.deleteTask}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{deleting ? t.deleting : t.deleteTask}</span>
                    </button>
                  </>
                )}

                {/* Worker actions */}
                {data && !data.isMine && (
                  <>
                    {expired ? (
                      <button
                        className="btn-hero-secondary text-sm opacity-60 cursor-not-allowed"
                        aria-disabled="true"
                        data-text={t.expired}
                        title={t.expiredHint}
                      >
                        <span className="btn-text">{t.expired}</span>
                      </button>
                    ) : evidenceApproved ? (
                      <>
                        <div className="w-full sm:w-auto px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/40 text-sm">
                          {t.approvalReceived}
                        </div>

                        {threadId ? (
                          <button onClick={() => openFloatingChat(threadId)} className="btn-hero-secondary text-sm" data-text={openChatLabel}>
                            <span className="btn-text">{openChatLabel}</span>
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {data.exclusive ? (
                          appStatus === "REJECTED" ? (
                            <button
                              className="btn-hero-secondary text-sm opacity-60 cursor-not-allowed"
                              data-text={t.rejectedBadge}
                              aria-disabled="true"
                            >
                              <span className="btn-text">{t.rejectedBadge}</span>
                            </button>
                          ) : appStatus === "PENDING" ? (
                            <>
                              <button
                                aria-disabled="true"
                                className="btn-hero-secondary text-sm opacity-60 cursor-not-allowed"
                                title={t.awaitingApproval}
                                data-text={t.awaitingApproval}
                              >
                                <span className="btn-text">{t.awaitingApproval}</span>
                              </button>

                              {threadId ? (
                                <button onClick={() => openFloatingChat(threadId)} className="btn-hero-secondary text-sm" data-text={openChatLabel}>
                                  <span className="btn-text">{openChatLabel}</span>
                                </button>
                              ) : (
                                <button
                                  aria-disabled="true"
                                  className="btn-hero-secondary text-sm opacity-60 cursor-not-allowed"
                                  title={t.chatUnavailable}
                                  data-text={openChatLabel}
                                >
                                  <span className="btn-text">{openChatLabel}</span>
                                </button>
                              )}
                            </>
                          ) : appStatus === "APPROVED" || hasTaken ? (
                            <>
                              {evidenceStatus === "NEEDS_FIXES" ? (
                                <button
                                  onClick={handleResubmitProof}
                                  className="btn-evidence-warning text-sm inline-flex items-center gap-2"
                                  data-text={t.resubmitProof}
                                  title={t.proofNeedsFixes}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  <span>{t.resubmitProof}</span>
                                </button>
                              ) : evidenceStatus === "PENDING" ? (
                                <button
                                  type="button"
                                  className="btn-hero-secondary text-sm opacity-60 cursor-not-allowed"
                                  aria-disabled="true"
                                  data-text={submitProofDisabledLabel}
                                >
                                  <span className="btn-text">{submitProofDisabledLabel}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={handleSubmitProof}
                                  className="btn-hero-primary text-sm inline-flex items-center gap-2"
                                  data-text={submitProofLabel}
                                >
                                  <Send className="w-4 h-4" />
                                  <span className="btn-text">{submitProofLabel}</span>
                                </button>
                              )}

                              {threadId ? (
                                <button onClick={() => openFloatingChat(threadId)} className="btn-hero-secondary text-sm" data-text={openChatLabel}>
                                  <span className="btn-text">{openChatLabel}</span>
                                </button>
                              ) : (
                                <button
                                  aria-disabled="true"
                                  className="btn-hero-secondary text-sm opacity-60 cursor-not-allowed"
                                  title={t.chatUnavailable}
                                  data-text={openChatLabel}
                                >
                                  <span className="btn-text">{openChatLabel}</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <button onClick={() => setApplyOpen(true)} className="btn-hero-secondary text-sm" data-text={applyLabel}>
                              <span className="btn-text">{applyLabel}</span>
                            </button>
                          )
                        ) : hasTaken ? (
                          <>
                            {evidenceStatus === "NEEDS_FIXES" ? (
                              <button
                                onClick={handleResubmitProof}
                                className="btn-evidence-warning text-sm inline-flex items-center gap-2"
                                data-text={t.resubmitProof}
                                title={t.proofNeedsFixes}
                              >
                                <RotateCcw className="w-4 h-4" />
                                <span>{t.resubmitProof}</span>
                              </button>
                            ) : evidenceStatus === "PENDING" ? (
                              <button
                                type="button"
                                className="btn-hero-secondary text-sm opacity-60 cursor-not-allowed"
                                aria-disabled="true"
                                data-text={submitProofDisabledLabel}
                              >
                                <span className="btn-text">{submitProofDisabledLabel}</span>
                              </button>
                            ) : (
                              <button
                                onClick={handleSubmitProof}
                                className="btn-hero-primary text-sm inline-flex items-center gap-2"
                                data-text={submitProofLabel}
                              >
                                <Send className="w-4 h-4" />
                                <span className="btn-text">{submitProofLabel}</span>
                              </button>
                            )}

                            <button
                              onClick={handleReturnClick}
                              disabled={returning}
                              className={
                                "btn-logout btn-no-glitch inline-flex items-center gap-2 text-sm " +
                                (hasEvidencePending ? "opacity-60 cursor-not-allowed" : "disabled:opacity-60")
                              }
                              title={hasEvidencePending ? t.cannotReturnAfterEvidence : undefined}
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>{returnLabel}</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleTake}
                            disabled={taking}
                            className="btn-hero-primary text-sm disabled:opacity-60"
                            data-text={takeLabel}
                          >
                            <span className="btn-text">{takeLabel}</span>
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Extend Deadline Popup (Owner) */}
              {extendOpen && data?.isMine && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                  <div className="w-[min(92vw,520px)] rounded-2xl bg-[#0b0f16] ring-1 ring-white/15 p-5 md:p-6 relative">
                    <button onClick={closeExtend} className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/15">
                      <X className="w-5 h-5" />
                    </button>

                    <div className="text-xl font-bold mb-2">{t.extendTitle}</div>
                    <div className="text-white/70 text-sm mb-4">
                      {t.chooseDeadline} <span className="text-white/50">({t.minTomorrow})</span>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="date"
                        value={extendDate}
                        min={toYmdLocal(startOfTomorrowLocal())}
                        onChange={(e) => setExtendDate(e.target.value)}
                        className="w-full rounded-xl bg-white/5 ring-1 ring-white/10 p-3 outline-none"
                      />

                      {extendErr && <div className="p-2 rounded-lg bg-red-500/10 text-red-300 text-sm">{extendErr}</div>}

                      <div className="flex justify-end gap-3 pt-2">
                        <button onClick={closeExtend} className="btn-modal-close text-sm" data-text={cancelLabel}>
                          <span className="btn-text">{cancelLabel}</span>
                        </button>
                        <button
                          onClick={saveExtendedDeadline}
                          disabled={extendBusy}
                          className="btn-hero-secondary text-sm disabled:opacity-60"
                          data-text={extendBusy ? t.saving : t.save}
                        >
                          <span className="btn-text">{extendBusy ? t.saving : t.save}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Exclusive Apply Popup */}
              {applyOpen && data?.exclusive && !data.isMine && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                  <div className="w-[min(92vw,560px)] rounded-2xl bg-[#0b0f16] ring-1 ring-white/15 p-5 md:p-6 relative">
                    <button onClick={closeApply} className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/15">
                      <X className="w-5 h-5" />
                    </button>

                    <div className="text-xl font-bold mb-2">{t.applyTitle}</div>
                    <div className="text-white/70 text-sm mb-4">
                      {t.applyHint} <span className="text-white/50">({t.optional})</span>
                    </div>

                    {applyDone ? (
                      <div className="space-y-4">
                        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-300">{t.sent}</div>

                        {applyDone.threadId ? (
                          <button onClick={() => openFloatingChat(applyDone.threadId)} className="btn-hero-secondary text-sm" data-text={t.goToChat}>
                            <span className="btn-text">{t.goToChat}</span>
                          </button>
                        ) : null}

                        <button onClick={closeApply} className="btn-modal-close text-sm" data-text={closeLabel}>
                          <span className="btn-text">{closeLabel}</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <textarea
                          value={applyMsg}
                          onChange={(e) => setApplyMsg(e.target.value)}
                          rows={5}
                          className="w-full rounded-xl bg-white/5 ring-1 ring-white/10 p-3 outline-none"
                          placeholder="…"
                        />
                        {applyErr && <div className="mt-3 p-2 rounded-lg bg-red-500/10 text-red-300 text-sm">{applyErr}</div>}

                        <div className="mt-4 flex justify-end gap-3">
                          <button onClick={closeApply} className="btn-modal-close text-sm" data-text={cancelLabel}>
                            <span className="btn-text">{cancelLabel}</span>
                          </button>
                          <button
                            onClick={submitApplication}
                            disabled={applyBusy}
                            className="btn-hero-secondary text-sm disabled:opacity-60"
                            data-text={sendLabel}
                          >
                            <span className="btn-text">{sendLabel}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
