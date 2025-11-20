// app/[locale]/mypage/created/new/page.tsx  (SERVER component)
import { prisma } from "@/lib/prisma";
import FormClient from "./FormClient";

type Locale = "ka" | "en";

export default async function Page({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams?: { draft?: string };
}) {
  const draftId = searchParams?.draft ?? null;

  let initialDraft:
    | {
        title?: string;
        desc?: string;
        category?: string;
        skill?: string;
        reward?: number;
        deadline?: string | null; // YYYY-MM-DD for <input type="date">
        where?: "REMOTE" | "ONSITE";
        address?: string | null;
        exclusive?: boolean;
        photos?: string[];
        proof?: string;
      }
    | null = null;

  if (draftId) {
    const raw = await prisma.task.findUnique({
      where: { id: draftId },
      select: {
        title: true,
        desc: true,
        category: true,
        skill: true,
        reward: true,
        deadline: true,
        where: true,      // "REMOTE" | "ONSITE"
        address: true,
        exclusive: true,
        photos: true,
        proof: true,
      },
    });

    if (raw) {
      // photos: JSON string -> string[]
      let photos: string[] = [];
      try {
        photos = JSON.parse(raw.photos ?? "[]") as string[];
      } catch {
        photos = [];
      }

      initialDraft = {
        title: raw.title ?? "",
        desc: raw.desc ?? "",
        category: raw.category ?? "",
        skill: raw.skill ?? "",
        reward: raw.reward ?? 0,
        // input[type=date]-ისთვის — "YYYY-MM-DD"
        deadline: raw.deadline ? raw.deadline.toISOString().slice(0, 10) : "",
        where: raw.where, // "REMOTE" | "ONSITE" — FormClient-ში გაქვს გარდაქმნა
        address: raw.address ?? null,
        exclusive: Boolean(raw.exclusive),
        photos,
        proof: raw.proof ?? "",
      };
    }
  }

  return <FormClient locale={locale} initialDraft={initialDraft} />;
}
