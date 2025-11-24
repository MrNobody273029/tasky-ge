"use client";

import React from "react";
import Link from "next/link";
import { CalendarClock, MapPin, Medal, Sparkles, Users } from "lucide-react";
import { openTaskModal } from "@/lib/taskModal";

type Locale = "ka" | "en";

const categoryLabel = (raw: string | undefined | null, loc: Locale) => {
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

const skillLabel = (raw: string | undefined | null, loc: Locale) => {
  const k = String(raw || "").toUpperCase();
  const map = {
    ka: { BEGINNER: "დამწყები", INTERMEDIATE: "საშუალო", EXPERT: "ექსპერტი" },
    en: { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", EXPERT: "Expert" },
  } as const;
  if ((map as any)[loc][k]) return (map as any)[loc][k];
  return raw || "—";
};


export type TaskCardInput = {
  id: string;
  locale: Locale;
  title: string;
  desc?: string;
  description?: string;
  deadline?: string | null;
  due?: string;
  where?: "REMOTE" | "ONSITE" | "remote" | "onsite";
  type?: string;
  category?: string;
  skill?: string;
  reward: number;
  exclusive?: boolean;
  status?: string; // "DRAFT" | "PUBLISHED"
};

type StatusBadge =
  | { kind: "pending"; text: string }
  | { kind: "rejected"; text: string }
  | { kind: "approved"; text: string };

export default function TaskCard({
  task,
  ctaLabel,
  statusBadge,
}: {
  task: TaskCardInput;
  ctaLabel?: string;
  /** optional little chip rendered inside the card (bottom-left) */
  statusBadge?: StatusBadge;
}) {
  const locale: Locale = task.locale === "ka" ? "ka" : "en";
  const t =
    locale === "ka"
      ? {
          view: "დეტალები",
          continue: "გაგრძელება",
          remote: "დისტანციური",
          onsite: "ადგილზე",
          type: "ტიპი",
          exclusive: "ექსკლუზიური",
          multi: "არაექსკლუზიური",
          draft: "დრაფტი",
        }
      : {
          view: "View & Claim",
          continue: "Continue",
          remote: "Remote",
          onsite: "On-site",
          type: "Type",
          exclusive: "Exclusive",
          multi: "Multi",
          draft: "Draft",
        };

  const desc = task.desc ?? task.description ?? "";
const whereRaw: string =
  (task.where as string | undefined) ??
  (task.type?.toLowerCase().includes("site") ? "ONSITE" : "REMOTE");
const whereUpper = whereRaw.toUpperCase();
const whereLabel = whereUpper === "ONSITE" ? t.onsite : t.remote;

  // skill / category – იგივე ჰელფერები, რაც TaskModal-ში
  const skill = skillLabel(task.skill, locale);
  const category = categoryLabel(task.category, locale);



  function calcDueLabel(deadline: string | null | undefined) {
    if (!deadline)
      return locale === "ka" ? "ვადა დაყენებული არაა" : "No deadline set";
    const target = new Date(deadline);
    if (Number.isNaN(target.getTime()))
      return locale === "ka" ? "ვადა დაყენებული არაა" : "No deadline set";
    const ms = target.getTime() - Date.now();
    if (ms <= 0) return locale === "ka" ? "დარჩა 0 დღე" : "Due in 0 day(s)";
    const days = Math.floor(ms / 86400000);
    if (days >= 1)
      return locale === "ka"
        ? `დარჩა ${days} დღე`
        : `Due in ${days} day(s)`;
    const hours = Math.ceil(ms / 3600000);
    return locale === "ka"
      ? `დარჩა ${hours} სთ`
      : `Due in ${hours} hour(s)`;
  }

  const isDraft = task.status === "DRAFT";
  const ctaText = isDraft ? t.continue : ctaLabel ?? t.view;
  const ctaHref = isDraft
    ? `/${task.locale}/mypage/created/new?draft=${task.id}`
    : `/${task.locale}/task/${task.id}`;

  /* styles for status badge (neon) */
  let badgeCls =
    "bg-white/10 text-white/80 ring-white/30 shadow-[0_0_12px_rgba(255,255,255,0.25)]";

  if (statusBadge?.kind === "pending") {
    badgeCls =
      "bg-yellow-400/10 text-yellow-200 ring-yellow-400/60 shadow-[0_0_16px_rgba(250,204,21,0.45)]";
  } else if (statusBadge?.kind === "rejected") {
    badgeCls =
      "bg-red-500/10 text-red-300 ring-red-500/60 shadow-[0_0_16px_rgba(248,113,113,0.45)]";
  } else if (statusBadge?.kind === "approved") {
    badgeCls =
      "bg-emerald-400/10 text-emerald-200 ring-emerald-400/60 shadow-[0_0_16px_rgba(52,211,153,0.45)]";
  }

  return (
    <div className="card p-4 relative flex flex-col h-full">
      {/* amount */}
      <div
        className="absolute right-4 top-4 rounded-full px-3 py-1 text-sm leading-none font-semibold
                   bg-[#17230a]/80 backdrop-blur-sm ring-1 ring-[#b6ff2e]/50
                   text-[#d9ff66] shadow-[0_0_20px_rgba(182,255,46,0.35)]"
        style={{
          textShadow:
            "0 0 8px #b6ff2e, 0 0 18px rgba(182,255,46,.8)",
        }}
      >
        ₾{Number.isFinite(task.reward) ? task.reward : 0}
      </div>

      <div className="flex flex-col gap-3 h-full">
        {/* Header */}
        <div className="flex items-start gap-2 pr-24">
          <h3 className="text-lg font-semibold">{task.title}</h3>
          {isDraft && (
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full border border-amber-300/30 text-amber-300 bg-amber-300/10">
              {t.draft}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-white/80 text-sm line-clamp-3">{desc}</p>

        {/* Meta info */}
        <div className="mt-1 flex flex-wrap gap-4 text-sm items-center">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-sky-400" />
            <span>{calcDueLabel(task.deadline ?? null)}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-400" />
            <span>{whereLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-amber-400" />
            <span>{skill}</span>
          </div>

          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span>{category}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>{t.type}:</span>
            {task.exclusive ? (
              <span className="px-2 py-0.5 rounded-md border border-yellow-400/70 bg-yellow-400/10 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.2)]">
                {locale === "ka" ? "ექსკლუზიური" : "Exclusive"}
              </span>
            ) : (
              <span>{locale === "ka" ? "არაექსკლუზიური" : "Multi"}</span>
            )}
          </div>
        </div>

        {/* Bottom row: status badge + CTA */}
        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          {statusBadge && (
            <div
              className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold ring-1 ${badgeCls}`}
            >
              {statusBadge.text}
            </div>
          )}

          {isDraft ? (
            <Link
              href={ctaHref}
              className="ml-auto btn-hero-secondary text-sm"
              data-text={ctaText}              // <<< გლიჩის ტექსტი
            >
              <span className="btn-text">{ctaText}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openTaskModal(task.id);
              }}
              className="ml-auto btn-hero-secondary text-sm"
              data-text={ctaText}              // <<< გლიჩის ტექსტი
            >
              <span className="btn-text">{ctaText}</span>
            </button>
          )}


        </div>

      </div>
    </div>
  );
}
