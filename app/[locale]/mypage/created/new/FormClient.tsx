"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Locale = "ka" | "en";

/* ================= i18n ================= */
type Dict = {
  pageTitle: string;
  title: string; titlePh: string;
  desc: string;  descPh: string;
  category: string; skill: string; reward: string; deadline: string;
  proof: string; proofPh: string;
  photos: string; photosHint: string;
  execType: string; exclusive: string; multi: string;
  location: string; remote: string; onsite: string;
  address: string; addressPh: string;
  saveDraft: string; publish: string;
  preview: string; viewClaim: string;
  previewDueIn: (s:{days?:number;hours?:number})=>string;
  opt:{ cat:string[]; skill:string[] };
  meta:{ type:string };

  // Payment modal
  payTitle: string;
  payWithBalance: string;
  payWithCard: string;
  currentBalance: string;
  platformFee: string;
  totalToPay: string;
  notEnoughBalance: string;
  cancel: string;
  feeNote: string;
  publishedOk: string;
  savedDraftOk: string;
};

const KA: Dict = {
  pageTitle:"ახალი დავალების შექმნა",
  title:"სათაური*", titlePh:"მოკლე და გასაგები სათაური",
  desc:"აღწერა / მოცულობა*", descPh:"რა უნდა გაკეთდეს?",
  category:"კატეგორია*", skill:"უნარების დონე*", reward:"ანაზღაურება (₾)*",
  deadline:"ვადა*", proof:"მტკიცებულებების წარდგენის წესი*", proofPh:"როგორ გადაამოწმებთ შესრულებას? (მაგ: სკრინები, ფაილები, ლინკი, მოკლე აღწერა...)",
  photos:"ფოტო(ები) — სურვილისამებრ", photosHint:"JPEG/PNG. რამდენიმე სურათის არჩევაც შეგიძლიათ.",
  execType:"შესრულების ტიპი", exclusive:"ექსკლუზიური", multi:"არაექსკლუზიური",
  location:"დავალების შესრულების ადგილი", remote:"დისტანციური", onsite:"ადგილზე",
  address:"მისამართი (სურვილისამებრ)", addressPh:"ქუჩა, ნომერი, ობიექტი…",
  saveDraft:"დრაფტად შენახვა", publish:"გამოქვეყნება",
  preview:"ცოცხალი ნახვა", viewClaim:"დეტალები",
  previewDueIn:({days,hours})=>{
    if (days!==undefined && days>=0) return `დარჩა ${days} დღე`;
    if (hours!==undefined && hours>=0) return `დარჩა ${hours} სთ`;
    return "ვადა დაყენებული არაა";
  },
  opt:{ cat:["კონტენტი","დიზაინი","დეველოპმენტი"], skill:["დამწყები","საშუალო","ექსპერტი"] },
  meta:{ type:"ტიპი" },

  payTitle: "გადახდა და გამოქვეყნება",
  payWithBalance: "ბალანსით გადახდა",
  payWithCard: "ბარათით გადახდა",
  currentBalance: "მიმდინარე ბალანსი",
  platformFee: "საიტის საკომისიო ",
  totalToPay: "სულ გადასახდელი",
  notEnoughBalance: "ბალანსზე საკმარისი თანხა არ არის. სცადე ბარათით გადახდა.",
  cancel: "გაუქმება",
  feeNote: "ჯილდო + საკომისიო",
  publishedOk: "დავალება წარმატებით გამოქვეყნდა!",
  savedDraftOk: "დავალება წარმატებით შეინახა დრაფტად",
};

const EN: Dict = {
  pageTitle:"Create New Task",
  title:"Title*", titlePh:"Short and clear title",
  desc:"Description / Scope*", descPh:"What needs to be done?",
  category:"Category*", skill:"Skill level*", reward:"Reward (₾)*",
  deadline:"Deadline*", proof:"Proof of completion (required)*", proofPh:"How will you verify completion? (e.g., screenshots, files, link, short report...)",
  photos:"Photo(s) — optional", photosHint:"JPEG/PNG. You may select multiple images.",
  execType:"Execution type", exclusive:"Exclusive", multi:"Multi-worker",
  location:"Work location", remote:"Remote", onsite:"On-site",
  address:"Address (optional)", addressPh:"Street, number, venue…",
  saveDraft:"Save as Draft", publish:"Publish",
  preview:"Live Preview", viewClaim:"View & Claim",
  previewDueIn:({days,hours})=>{
    if (days!==undefined && days>=0) return `Due in ${days} day(s)`;
    if (hours!==undefined && hours>=0) return `Due in ${hours} hour(s)`;
    return "No deadline set";
  },
  opt:{ cat:["Content","Design","Development"], skill:["Beginner","Intermediate","Expert"] },
  meta:{ type:"Type" },

  payTitle: "Pay & Publish",
  payWithBalance: "Pay with Balance",
  payWithCard: "Pay by Card",
  currentBalance: "Current balance",
  platformFee: "Platform fee ",
  totalToPay: "Total to pay",
  notEnoughBalance: "Insufficient balance. Please pay by card.",
  cancel: "Cancel",
  feeNote: "Reward + fee",
  publishedOk: "Task published successfully!",
  savedDraftOk: "Draft saved successfully.",
};

/* ===== normalize helpers (skill/category) ===== */
const SKILL_TO_KEY = {
  დამწყები:"BEGINNER", საშუალო:"INTERMEDIATE", ექსპერტი:"EXPERT",
  Beginner:"BEGINNER", Intermediate:"INTERMEDIATE", Expert:"EXPERT",
} as const;
const SKILL_FROM_KEY = {
  ka:{BEGINNER:"დამწყები",INTERMEDIATE:"საშუალო",EXPERT:"ექსპერტი"},
  en:{BEGINNER:"Beginner",INTERMEDIATE:"Intermediate",EXPERT:"Expert"},
} as const;
function mapSkillToLocale(v:string|undefined, locale:Locale){
  const key = v ? (SKILL_TO_KEY as any)[v] : undefined;
  return key ? (SKILL_FROM_KEY as any)[locale][key] : (locale==="ka"?"საშუალო":"Intermediate");
}
const CAT_TO_KEY = {
  კონტენტი:"CONTENT", დიზაინი:"DESIGN", დეველოპმენტი:"DEV",
  Content:"CONTENT", Design:"DESIGN", Development:"DEV",
} as const;
const CAT_FROM_KEY = {
  ka:{CONTENT:"კონტენტი",DESIGN:"დიზაინი",DEV:"დეველოპმენტი"},
  en:{CONTENT:"Content",DESIGN:"Design",DEV:"Development"},
} as const;
function mapCategoryToLocale(v:string|undefined, locale:Locale){
  const key = v ? (CAT_TO_KEY as any)[v] : undefined;
  return key ? (CAT_FROM_KEY as any)[locale][key] : (locale==="ka"?"კონტენტი":"Content");
}

/* =============== Icons (simple inline SVGs) =============== */
function IconClock(props:React.SVGProps<SVGSVGElement>){
  return(<svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>);
}
function IconMapPin(props:React.SVGProps<SVGSVGElement>){
  return(<svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
    <path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
  </svg>);
}
function IconMedal(props:React.SVGProps<SVGSVGElement>){
  return(<svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
    <circle cx="12" cy="13" r="5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 3h3l1 3 1-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>);
}
function IconSpark(props:React.SVGProps<SVGSVGElement>){
  return(<svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
    <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" stroke="currentColor" strokeWidth="1.5"/>
  </svg>);
}
function IconUsers(props:React.SVGProps<SVGSVGElement>){
  return(<svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
    <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M15 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3 20a6 6 0 0 1 12 0M9 16a7 7 0 0 1 7 4" stroke="currentColor" strokeWidth="1.5"/>
  </svg>);
}

/* =============== helpers =============== */
function calcDueLabel(dateStr:string|null, t:Dict){
  if(!dateStr) return t.previewDueIn({});
  const ms = new Date(dateStr+"T23:59:59").getTime() - Date.now();
  if (ms<=0) return t.previewDueIn({days:0});
  const days = Math.floor(ms/86400000);
  if (days>=1) return t.previewDueIn({days});
  return t.previewDueIn({hours: Math.ceil(ms/3600000)});
}
/* =============== HOLO inputs for this page =============== */

function HoloInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="glitch-input-wrapper mb-4">
      <div className="input-container">
        <input
          id={id}
          type={type}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="holo-input"
          placeholder=" "
          disabled={disabled}
        />

        <label
          htmlFor={id}
          className="input-label"
          data-text={label}
        >
          {label}
        </label>

        <div className="input-border" />
        <div className="input-scanline" />
        <div className="input-glow" />

        <div className="input-data-stream">
          <div className="stream-bar" style={{ "--i": 0 } as any} />
          <div className="stream-bar" style={{ "--i": 1 } as any} />
          <div className="stream-bar" style={{ "--i": 2 } as any} />
          <div className="stream-bar" style={{ "--i": 3 } as any} />
          <div className="stream-bar" style={{ "--i": 4 } as any} />
          <div className="stream-bar" style={{ "--i": 5 } as any} />
          <div className="stream-bar" style={{ "--i": 6 } as any} />
          <div className="stream-bar" style={{ "--i": 7 } as any} />
          <div className="stream-bar" style={{ "--i": 8 } as any} />
          <div className="stream-bar" style={{ "--i": 9 } as any} />
        </div>

        <div className="input-corners">
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />
        </div>
      </div>
    </div>
  );
}

function HoloTextarea({
  id,
  label,
  value,
  onChange,
  disabled,
  minHeight = 160,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  minHeight?: number;
}) {
  return (
    <div className="glitch-input-wrapper mb-4">
      <div className="input-container">
        <textarea
          id={id}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="holo-input"
          placeholder=" "
          disabled={disabled}
          style={{ height: "auto", minHeight }}
        />
        <label
          htmlFor={id}
          className="input-label"
          data-text={label}
        >
          {label}
        </label>

        <div className="input-border" />
        <div className="input-scanline" />
        <div className="input-glow" />

        <div className="input-data-stream">
          <div className="stream-bar" style={{ "--i": 0 } as any} />
          <div className="stream-bar" style={{ "--i": 1 } as any} />
          <div className="stream-bar" style={{ "--i": 2 } as any} />
          <div className="stream-bar" style={{ "--i": 3 } as any} />
          <div className="stream-bar" style={{ "--i": 4 } as any} />
          <div className="stream-bar" style={{ "--i": 5 } as any} />
          <div className="stream-bar" style={{ "--i": 6 } as any} />
          <div className="stream-bar" style={{ "--i": 7 } as any} />
          <div className="stream-bar" style={{ "--i": 8 } as any} />
          <div className="stream-bar" style={{ "--i": 9 } as any} />
        </div>

        <div className="input-corners">
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />
        </div>
      </div>
    </div>
  );
}
// HoloStaticBox – პატარა ცვლილება
function HoloStaticBox({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glitch-input-wrapper mb-4 ${className ?? ""}`}>
      <div className="input-container">
        {children}

        <div className="input-border" />
        <div className="input-corners">
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />
        </div>
      </div>
    </div>
  );
}


/* =============== Component =============== */
export default function FormClient({
  locale,
  initialDraft,
}: {
  locale: Locale;
  initialDraft?: {
    title?: string;
    desc?: string;
    category?: string;
    skill?: string;
    reward?: number;
    deadline?: string | null;
    where?: "REMOTE" | "ONSITE";
    address?: string | null;
    exclusive?: boolean;
    proof?: string;
    photos?: string[];
  } | null;
}) {
  const t = locale === "ka" ? KA : EN;
  const router = useRouter();
  const params = useSearchParams();
  const draftId = params.get("draft");

  // ✅ locally tracked taskId for this editor session (important for publish-fee binding)
  const [taskId, setTaskId] = React.useState<string | null>(draftId);

  // ბალანსი უკვე სერვერიდან /api/my/wallet-ით
  const [balance, setBalance] = React.useState<number>(0);
  const [commissionPct, setCommissionPct] = React.useState<number>(10);

  React.useEffect(() => {
    let alive = true;
    async function loadBalance() {
      try {
        const res = await fetch("/api/my/wallet", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setBalance(Number(data?.available ?? 0) || 0);
      } catch {
        if (!alive) return;
        setBalance(0);
      }
    }
    loadBalance();
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    let alive = true;

    async function loadMe() {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setCommissionPct(
          typeof data?.commissionPct === 'number'
            ? data.commissionPct
            : 10,
        );
      } catch {
        if (!alive) return;
        setCommissionPct(10);
      }
    }

    loadMe();
    return () => {
      alive = false;
    };
  }, []);

  // ---- initial (prefilled) values ----
  const [title, setTitle]       = React.useState<string>(initialDraft?.title ?? "");
  const [desc, setDesc]         = React.useState<string>(initialDraft?.desc ?? "");
  const [category, setCategory] = React.useState<string>(mapCategoryToLocale(initialDraft?.category, locale));
  const [skill, setSkill]       = React.useState<string>(mapSkillToLocale(initialDraft?.skill, locale));
  const [reward, setReward]     = React.useState<string>(String(initialDraft?.reward ?? "180"));
  const [deadline, setDeadline] = React.useState<string>(initialDraft?.deadline ? new Date(initialDraft.deadline).toISOString().slice(0,10) : "");
  const [proof, setProof]       = React.useState<string>(initialDraft?.proof ?? "");
  const [exclusive, setExclusive] = React.useState<boolean>(Boolean(initialDraft?.exclusive));
  const [where, setWhere]       = React.useState<"remote"|"onsite">(initialDraft?.where==="ONSITE" ? "onsite" : "remote");
  const [address, setAddress]   = React.useState<string>(initialDraft?.address ?? "");
  const [existingPhotos, setExistingPhotos] = React.useState<string[]>(
    Array.isArray(initialDraft?.photos) ? initialDraft!.photos! : []
  );

  React.useEffect(()=>{
    setCategory((prev)=> mapCategoryToLocale(prev, locale));
    setSkill((prev)=> mapSkillToLocale(prev, locale));
  },[locale]);

  const [files, setFiles] = React.useState<File[]>([]);
  const [saving, setSaving] = React.useState<"idle"|"draft"|"publish">("idle");
  const [errorMsg, setErrorMsg] = React.useState<string|null>(null);
  const [uploadingPhotos, setUploadingPhotos] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);

  // payment modal state
  const [payOpen, setPayOpen] = React.useState(false);
  const [payErr, setPayErr] = React.useState<string | null>(null);

  const rewardNum = Number(reward || 0);
  const fee = Math.max(0, Math.round((rewardNum * commissionPct) / 100));
  const totalToPay = Math.max(0, rewardNum + fee);

  const dueLabel = React.useMemo(()=>calcDueLabel(deadline||null, t),[deadline, t]);

  function onFileChange(e:React.ChangeEvent<HTMLInputElement>){
    const selected = e.target.files ? Array.from(e.target.files) : [];
    const key = (f:File)=>`${f.name}-${f.size}-${f.lastModified}`;
    setFiles(prev=>{
      const map = new Map(prev.map(f=>[key(f),f]));
      for (const f of selected) map.set(key(f), f);
      return Array.from(map.values());
    });
    e.target.value = "";
  }

  async function uploadAllTaskPhotos(files: File[]): Promise<string[]> {
    if (!files?.length) return [];

    setUploadProgress(0);

    const signRes = await fetch("/api/upload/sign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "task" }),
    });
    if (!signRes.ok) {
      const j = await signRes.json().catch(() => ({}));
      throw new Error(j?.error || "Signing failed");
    }
    const raw = await signRes.json();

    const signature = raw.signature;
    const timestamp = raw.timestamp;
    const folder    = raw.folder;
    const cloudName = raw?.cloud?.cloudName ?? raw?.cloudName;
    const apiKey    = raw?.cloud?.apiKey    ?? raw?.apiKey;

    if (!cloudName || !apiKey) {
      throw new Error("Cloudinary info missing from /api/upload/sign response");
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    let completed = 0;
    const total = files.length;

    const uploads = files.map(async (file) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", String(apiKey));
      fd.append("timestamp", String(timestamp));
      fd.append("signature", String(signature));
      fd.append("folder", folder);

      const r = await fetch(endpoint, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || "Upload failed");

      completed += 1;
      const pct = Math.round((completed / total) * 100);
      setUploadProgress(pct);

      return j.secure_url as string;
    });

    return Promise.all(uploads);
  }

  function removeFile(idx:number){
    setFiles(prev=>prev.filter((_,i)=>i!==idx));
  }

  // ღილაკების ტექსტი (სტატუსის მიხედვით) + გლიჩისთვის data-text
  const draftLabel =
    saving === "draft"
      ? (locale === "ka" ? "შენახვა..." : "Saving...")
      : t.saveDraft;

  const publishLabel =
    saving === "publish"
      ? (locale === "ka" ? "გამოქვეყნება..." : "Publishing...")
      : t.publish;

  const optionStyle = { backgroundColor:"#000", color:"#fff" } as const;

  // ✅ upsert helper (no redirects, returns id). uploadPhotos default true.
  async function upsertTask(
    status: "draft" | "published",
    opts?: { uploadPhotos?: boolean }
  ): Promise<{ id: string }> {
    const uploadPhotos = opts?.uploadPhotos !== false;

    let newPhotoUrls: string[] = [];

    if (uploadPhotos && files.length > 0) {
      setUploadingPhotos(true);
      setUploadProgress(0);

      newPhotoUrls = await uploadAllTaskPhotos(files).catch((e) => {
        throw new Error(e?.message || "Photo upload failed");
      });

      setUploadingPhotos(false);
      setUploadProgress(null);
    }

    const allPhotos = uploadPhotos ? [...existingPhotos, ...newPhotoUrls] : [...existingPhotos];

    const payload = {
      locale,
      title,
      desc,
      category,
      skill,
      reward: Number(reward),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      where,
      address: where === "onsite" ? (address || null) : null,
      exclusive,
      status,
      proof,
      photos: JSON.stringify(allPhotos),
    };

    let id = taskId || "";

    if (id) {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Request failed");
      }
      return { id };
    }

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || "Request failed");
    }
    const data = (await res.json()) as { id: string };
    id = data.id;

    setTaskId(id);
    return { id };
  }

  async function saveTask(status: "draft" | "published") {
    try {
      setErrorMsg(null);
      setSaving(status === "draft" ? "draft" : "publish");

      const { id } = await upsertTask(status, { uploadPhotos: true });

      alert(status === "draft" ? t.savedDraftOk : t.publishedOk);
      try { window.dispatchEvent(new Event('tasky:tasks-updated')); } catch {}

      if (status === "draft") {
        router.push(`/${locale}/mypage/created?tab=drafts`);
      } else {
        try { localStorage.setItem("tasky.openTask", id); } catch {}
        router.push(`/${locale}?task=${id}`);
      }
    } catch (err: any) {
      setUploadingPhotos(false);
      setUploadProgress(null);
      setErrorMsg(err?.message || "Something went wrong");
      setSaving("idle");
    }
  }

  // ----- Payment actions -----
  function openPayModal(){
    setPayErr(null);
    setPayOpen(true);
  }

  async function payWithBalance() {
    setPayErr(null);

    if (balance < totalToPay) {
      setPayErr(t.notEnoughBalance);
      return;
    }

    setSaving("publish");

    try {
      // ✅ 1) ensure we have a taskId WITHOUT uploading photos yet
      const { id } = await upsertTask("draft", { uploadPhotos: false });

      // ✅ 2) pay publish fee bound to taskId
      const res = await fetch("/api/my/wallet/publish-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalToPay,
          method: "balance",
          taskTitle: title || (locale === "ka" ? "დავალება" : "Task"),
          taskId: id, // ✅ CRITICAL
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        if (data?.error === "insufficient_balance") {
          setPayErr(t.notEnoughBalance);
        } else {
          setPayErr(data?.error || "Payment failed");
        }
        setSaving("idle");
        return;
      }

      if (typeof data?.available === "number") {
        setBalance(Number(data.available) || 0);
      }

      setPayOpen(false);

      // ✅ 3) now publish (uploads photos once + PUT by taskId)
      await saveTask("published");
    } catch (err: any) {
      setPayErr(err?.message || "Payment failed");
      setSaving("idle");
    }
  }

  async function payWithCard() {
    setPayErr(null);
    setSaving("publish");

    try {
      const { id } = await upsertTask("draft", { uploadPhotos: false });

      const res = await fetch("/api/my/wallet/publish-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalToPay,
          method: "card",
          taskTitle: title || (locale === "ka" ? "დავალება" : "Task"),
          taskId: id, // ✅ CRITICAL
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setPayErr(data?.error || "Payment failed");
        setSaving("idle");
        return;
      }

      if (typeof data?.available === "number") {
        setBalance(Number(data.available) || 0);
      }

      setPayOpen(false);
      await saveTask("published");
    } catch (err: any) {
      setPayErr(err?.message || "Payment failed");
      setSaving("idle");
    }
  }

  return (
    <div className="space-y-6">
      {/* უკან დაბრუნება */}
      <button
        type="button"
        onClick={() => router.back()}
        className="btn-hero-ghost btn-topbar-solid text-sm flex items-center gap-2 px-4 py-2 rounded-xl"
      >
        <span>←</span>
        <span>{locale === "ka" ? "უკან" : "Back"}</span>
      </button>

      <h1 className="text-3xl font-bold">{t.pageTitle}</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: form */}
        <form
          className="lg:col-span-2 card p-6 space-y-4"
          onSubmit={(e)=>{ 
            e.preventDefault(); 
            if(saving!=="idle") return; 
            openPayModal();
          }}
        >
          <HoloInput
            id="task-title"
            label={t.title}
            value={title}
            onChange={setTitle}
            disabled={saving !== "idle"}
          />

          <HoloTextarea
            id="task-desc"
            label={t.desc}
            value={desc}
            onChange={setDesc}
            disabled={saving !== "idle"}
            minHeight={160}
          />

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">{t.category}</label>
              <HoloStaticBox>
                <select
                  className="w-full h-[3.5rem] bg-black/70 text-white px-4 border-none rounded-none outline-none"
                  value={category}
                  onChange={(e)=>setCategory(e.target.value)}
                  required
                >
                  {t.opt.cat.map(c=> (
                    <option key={c} style={optionStyle}>{c}</option>
                  ))}
                </select>
              </HoloStaticBox>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">{t.skill}</label>
              <HoloStaticBox>
                <select
                  className="w-full h-[3.5rem] bg-black/70 text-white px-4 border-none rounded-none outline-none"
                  value={skill}
                  onChange={(e)=>setSkill(e.target.value)}
                  required
                >
                  {t.opt.skill.map(s=> (
                    <option key={s} style={optionStyle}>{s}</option>
                  ))}
                </select>
              </HoloStaticBox>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">{t.reward}</label>
              <HoloInput
                id="task-reward"
                label=""
                type="number"
                value={reward}
                onChange={setReward}
                disabled={saving !== "idle"}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">{t.deadline}</label>
              <HoloStaticBox>
                <input
                  type="date"
                  className="w-full h-[3.5rem] bg-black/70 text-white px-4 border-none rounded-none outline-none"
                  value={deadline}
                  onChange={(e)=>setDeadline(e.target.value)}
                  required
                />
              </HoloStaticBox>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">{t.location}</label>
              <HoloStaticBox>
                <select
                  className="w-full h-[3.5rem] bg-black/70 text-white px-4 border-none rounded-none outline-none"
                  value={where}
                  onChange={(e)=>setWhere(e.target.value as "remote"|"onsite")}
                >
                  <option value="remote" style={optionStyle}>{t.remote}</option>
                  <option value="onsite" style={optionStyle}>{t.onsite}</option>
                </select>
              </HoloStaticBox>
            </div>
          </div>

          {where === "onsite" && (
            <HoloInput
              id="task-address"
              label={t.address}
              value={address}
              onChange={setAddress}
              disabled={saving !== "idle"}
            />
          )}

          <div>
            <label className="block text-sm text-white/70 mb-1">{t.execType}</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setExclusive(false)}
                className={`${!exclusive ? "btn-tab-active" : "btn-hero-ghost"} text-sm disabled:opacity-60`}
                disabled={saving !== "idle"}
                data-text={t.multi}
              >
                <span className="btn-text">{t.multi}</span>
              </button>

              <button
                type="button"
                onClick={() => setExclusive(true)}
                className={`${exclusive ? "btn-tab-active" : "btn-hero-ghost"} text-sm disabled:opacity-60`}
                disabled={saving !== "idle"}
                data-text={t.exclusive}
              >
                <span className="btn-text">{t.exclusive}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">{t.photos}</label>

            <div className="mt-2 flex items-center gap-4">
              <div className="photo-upload-circle">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  fill="none"
                  stroke="currentColor"
                  className="photo-upload-icon"
                  aria-hidden="true"
                >
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                  <polyline points="16 16 12 12 8 16" />
                </svg>

                <input
                  id="task-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFileChange}
                  disabled={saving !== "idle"}
                  className="photo-upload-input"
                  aria-label={t.photos}
                  title={t.photos}
                />
              </div>

              <div className="text-xs text-white/50">
                {t.photosHint}
              </div>
            </div>

            {existingPhotos.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                {existingPhotos.map((url, i) => (
                  <div
                    key={`exist-${i}`}
                    className="relative rounded-lg bg-white/5 p-2 flex items-center justify-center"
                    style={{ height: 120 }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (saving !== "idle") return;
                        setExistingPhotos(prev => prev.filter((_, idx) => idx !== i));
                      }}
                      className="absolute right-1 top-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs px-2 py-1"
                      aria-label="Remove"
                      title={locale === "ka" ? "წაშლა" : "Remove"}
                      disabled={saving !== "idle"}
                    >
                      ✕
                    </button>
                    <img
                      src={url}
                      alt={`photo-${i + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                {files.map((f, i) => {
                  const src = URL.createObjectURL(f);
                  return (
                    <div
                      key={i}
                      className="relative rounded-lg bg:white/5 p-2 flex items-center justify-center"
                      style={{ height: 120 }}
                    >
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs px-2 py-1"
                        aria-label="Remove"
                        title={locale === "ka" ? "წაშლა" : "Remove"}
                        disabled={saving !== "idle"}
                      >
                        ✕
                      </button>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={f.name}
                        className="max-h-full max-w-full object-contain"
                        onLoad={() => URL.revokeObjectURL(src)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <HoloTextarea
            id="task-proof"
            label={t.proof}
            value={proof}
            onChange={setProof}
            disabled={saving !== "idle"}
            minHeight={110}
          />

          {errorMsg && <div className="text-red-400 text-sm">{errorMsg}</div>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => saveTask("draft")}
              className="btn-hero-secondary text-sm disabled:opacity-60"
              disabled={saving !== "idle"}
              data-text={draftLabel}
            >
              <span className="btn-text">{draftLabel}</span>
            </button>

            <button
              type="submit"
              className="btn-hero-primary text-sm disabled:opacity-60"
              disabled={saving !== "idle"}
              data-text={publishLabel}
            >
              <span className="btn-text">{publishLabel}</span>
            </button>
          </div>

          {uploadingPhotos && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              <div className="relative card px-6 py-5 w-[min(420px,92vw)] space-y-4 text-center">
                <div className="text-sm text-white/70">
                  {locale === "ka" ? "მიმდინარეობს ფოტოების ატვირთვა" : "Uploading photos"}
                </div>

                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                  <div
                    className="h-full bg-[#00e5ff] shadow-[0_0_20px_rgba(0,229,255,0.9)] transition-[width] duration-200 ease-out"
                    style={{ width: `${uploadProgress ?? 0}%` }}
                  />
                </div>

                <div className="text-xs text-white/60">
                  {uploadProgress ?? 0}%
                </div>
              </div>
            </div>
          )}
        </form>

        {/* RIGHT: live preview */}
        <aside className="card p-6 lg:sticky lg:top-1/2 lg:-translate-y-1/2 self-start">
          <div className="font-semibold mb-3">{t.preview}</div>
          <div className="relative rounded-2xl bg-white/5 p-4">
            <div
              className="absolute right-4 top-4 rounded-full px-4 py-1.5 text-base leading-none font-semibold
                          bg-[#17230a]/80 backdrop-blur-sm ring-1 ring-[#b6ff2e]/50 text-[#d9ff66]
                          shadow-[0_0_20px_rgba(182,255,46,0.35)]"
              style={{textShadow:"0 0 8px #b6ff2e, 0 0 18px rgba(182,255,46,.8)"}}
            >
              ₾{isNaN(rewardNum) ? 0 : rewardNum}
            </div>

            <div className="text-lg font-semibold pr-24">
              {title || (locale==="ka" ? "სათაური სავალდებულოა" : "Add a title")}
            </div>

            <div className="mt-2 text-sm text-white/70 line-clamp-2">
              {desc || (locale==="ka" ? "მოკლე აღწერა…" : "Short description…")}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm items-center">
              <div className="flex items-center gap-2"><IconClock className="w-4 h-4 text-sky-400"/><span>{dueLabel}</span></div>
              <div className="flex items:center gap-2"><IconMapPin className="w-4 h-4 text-rose-400"/><span>{where==="remote"?t.remote:t.onsite}</span></div>
              <div className="flex items-center gap-2"><IconMedal className="w-4 h-4 text-amber-400"/><span>{skill}</span></div>
              <div className="flex items-center gap-2"><IconSpark className="w-4 h-4 text-fuchsia-400"/><span>{category}</span></div>
              <div className="flex items-center gap-2">
                <IconUsers className="w-4 h-4 text-emerald-400" />
                <span>{t.meta.type}:</span>
                {exclusive ? (
                  <span className="px-2 py-0.5 rounded-md border border-yellow-400/70 bg-yellow-400/10 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.2)]">
                    {locale === "ka" ? "ექსკლუზიური" : "Exclusive"}
                  </span>
                ) : (
                  <span>{locale === "ka" ? "არაექსკლუზიური" : "Multi"}</span>
                )}
              </div>
            </div>

            {(existingPhotos.length + files.length) > 0 && (
              <div className="mt-3 text-xs text-white/70">
                {locale==="ka"
                  ? `მიმაგრებულია ${(existingPhotos.length + files.length)} ფოტო`
                  : `${(existingPhotos.length + files.length)} photo(s) attached`}
              </div>
            )}

            <div className="mt-4">
              <button
                className="btn-hero-secondary text-sm"
                type="button"
                aria-disabled="true"
                data-text={t.viewClaim}
              >
                <span className="btn-text">{t.viewClaim}</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ===== Payment modal ===== */}
      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setPayOpen(false)} />
          <div className="relative bg-[#0b0f16]/95 ring-1 ring-white/10 rounded-2xl p-6 w-[min(520px,92vw)] space-y-4">
            <div className="text-xl font-semibold">{t.payTitle}</div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/70">{t.reward}</div>
                <div className="text-lg font-semibold">₾{Math.max(0, rewardNum)}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/70">
                  {t.platformFee}{' '}
                  <span className="text-xs text-white/50">
                    ({commissionPct}%)
                  </span>
                </div>
                <div className="text-lg font-semibold">₾{fee}</div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
              <div className="text-white/70">
                {t.totalToPay}{' '}
                <span className="text-xs">
                  ({t.feeNote} {commissionPct}%)
                </span>
              </div>
              <div className="text-xl font-semibold">₾{totalToPay}</div>
            </div>

            <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
              <div className="text-white/70">{t.currentBalance}</div>
              <div className="text-lg font-semibold">₾{balance}</div>
            </div>

            {payErr && <div className="text-red-400 text-sm">{payErr}</div>}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                disabled={saving !== "idle"}
                className="btn-modal-close text-sm disabled:opacity-60"
                data-text={t.cancel}
              >
                <span className="btn-text">{t.cancel}</span>
              </button>

              <button
                type="button"
                onClick={payWithCard}
                disabled={saving !== "idle"}
                className="btn-hero-secondary text-sm disabled:opacity-60"
                data-text={t.payWithCard}
              >
                <span className="btn-text">{t.payWithCard}</span>
              </button>

              <button
                type="button"
                onClick={payWithBalance}
                disabled={saving !== "idle"}
                className="btn-hero-primary text-sm disabled:opacity-60"
                data-text={t.payWithBalance}
              >
                <span className="btn-text">{t.payWithBalance}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
