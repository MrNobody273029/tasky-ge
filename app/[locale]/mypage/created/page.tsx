// app/[locale]/mypage/created/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TaskCard, { TaskCardInput } from "@/components/TaskCard";
import { headers, cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Locale = "ka" | "en";

type PageProps = {
  params: { locale: Locale };
  searchParams?: { tab?: string };
};

/** ამოიღებს viewerId-ს სერვერზე: header/cookie ან guest */
function getViewerId(): string {
  const h = headers();
  const c = cookies();
  return (
    h.get("x-user-id") ||
    c.get("x-user-id")?.value ||
    c.get("uid")?.value ||
    c.get("email")?.value ||
    c.get("token")?.value ||
    "guest"
  );
}

export default async function Created({
  params: { locale },
  searchParams,
}: PageProps) {
  // ✅ დეფოლტად "published"; drafts მხოლოდ მაშინ, როცა ?tab=drafts
  const tab = (searchParams?.tab === "drafts" ? "drafts" : "published") as
    | "drafts"
    | "published";

  const userId = getViewerId();

  const statusFilter = tab === "drafts" ? "DRAFT" : "PUBLISHED";

  // case-insensitive-მიმსგავსებლად ვეძებთ ყველა ვარიანტს
  const candidateIds = Array.from(
    new Set([userId, userId.toLowerCase(), userId.toUpperCase()])
  );

  // locale-ს არ ვფილტრავთ, რომ ორივე ენაზე გამოჩნდეს
  const tasks = await prisma.task.findMany({
    where: {
      authorId: { in: candidateIds },
      status: statusFilter as any,
    },
    orderBy: { createdAt: "desc" },
  });

  const t =
    locale === "ka"
      ? {
          title: "ჩემი დადებული დავალებები",
          create: "ახალი დავალების შექმნა",
          drafts: "დრაფტები",
          published: "გამოქვეყნებული",
          emptyDrafts: "ჯერ დრაფტები არ გაქვს.",
          emptyPublished: "ჯერ გამოქვეყნებული დავალებები არ გაქვს.",
        }
      : {
          title: "My Created Tasks",
          create: "Create New Task",
          drafts: "Drafts",
          published: "Published",
          emptyDrafts: "You have no drafts yet.",
          emptyPublished: "You have no published tasks yet.",
        };

  // TaskCard-სთვის ადაპტერი — ბარათის ენა ვაყენებთ მიმდინარე გვერდის ენაზე
function toCardInput(db: any): TaskCardInput {
  return {
    id: db.id,
    locale,                 // ბარათის ენა (ka/en)
    title: db.title,
    desc: db.desc ?? "",

    // ❗ აქ არაფერს არ ვთარგმნით, პირდაპირ ვაძლევთ ბაზის enum-ს
    category: db.category ?? undefined,   // მაგ: "content" / "design" / "development"
    skill: db.skill ?? undefined,         // მაგ: "BEGINNER" / "INTERMEDIATE" / "EXPERT"

    // deadline 그대로 ISO, მაგრამ თუ უკვე Date-ია, toISOString გამოვიძახოთ
    deadline: db.deadline
      ? (db.deadline instanceof Date
          ? db.deadline.toISOString()
          : new Date(db.deadline).toISOString())
      : null,

    // where-საც 그대로 ვაძლევთ, TaskCard უკვე უმკლავდება upper/lower-case-ს
    where: db.where as TaskCardInput["where"],

    reward: Number(db.reward) || 0,
    exclusive: Boolean(db.exclusive),
    status: db.status, // "DRAFT" | "PUBLISHED"
  };
}


  // 🎨 არჩეული ტაბი ოდნავ უფრო მუქია
  const activeTab = "btn-tab-active text-sm";
  const inactiveTab = "btn-hero-ghost text-sm";
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <div className="flex items-center gap-2">
          {/* ↔️ მარცხნივ გამოქვეყნებული, მარჯვივ დრაფტები */}

                  <Link
            href={`/${locale}/mypage/created?tab=published`}
            className={tab === "published" ? activeTab : inactiveTab}
          >
            <span>{t.published}</span>
          </Link>

          <Link
            href={`/${locale}/mypage/created?tab=drafts`}
            className={tab === "drafts" ? activeTab : inactiveTab}
          >
            <span>{t.drafts}</span>
          </Link>


          <Link
            href={`/${locale}/mypage/created/new`}
            className="btn-hero-secondary text-sm"
          >
            <span>{t.create}</span>
          </Link>


        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-white/60">
          {tab === "drafts" ? t.emptyDrafts : t.emptyPublished}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={toCardInput(task)} />
          ))}
        </div>
      )}
    </div>
  );
}
