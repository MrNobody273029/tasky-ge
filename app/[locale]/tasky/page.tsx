// app/[locale]/tasky/page.tsx
import { prisma } from "@/lib/prisma";
import TaskCard, { TaskCardInput } from "@/components/TaskCard";
import ka from "../../../messages/ka.json";
import en from "../../../messages/en.json";
import TaskyFilterSelect from "@/components/TaskyFilterSelect";

type Locale = "ka" | "en";

type SearchParams = {
  q?: string;
  cat?: "content" | "design" | "dev";
  skill?: "beginner" | "intermediate" | "expert";
  where?: "remote" | "onsite";
  type?: "exclusive" | "multi";
};

export const metadata = { title: "Browse Tasks" };

// სინონიმები
const CAT_SYNONYMS = {
  content: ["Content", "კონტენტი"],
  design: ["Design", "დიზაინი"],
  dev: ["Development", "დეველოპმენტი"],
} as const;

const SKILL_SYNONYMS = {
  beginner: ["Beginner", "დამწყები"],
  intermediate: ["Intermediate", "საშუალო"],
  expert: ["Expert", "ექსპერტი"],
} as const;

export default async function Tasky({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: SearchParams;
}) {
  const m: any = locale === "ka" ? ka : en;

  const { q, cat, skill, where, type } = searchParams;

  const prismaWhere: any = { status: "PUBLISHED" };

  // ✅ hide deadline-expired tasks (deadline < now). Keep tasks with no deadline.
  const now = new Date();
  prismaWhere.AND = [
    {
      OR: [{ deadline: null }, { deadline: { gt: now } }],
    },
  ];

  if (q && q.trim()) {
    prismaWhere.OR = [
      { title: { contains: q.trim(), mode: "insensitive" } },
      { desc: { contains: q.trim(), mode: "insensitive" } },
    ];
  }

  if (cat && cat in CAT_SYNONYMS) {
    const list = CAT_SYNONYMS[cat as keyof typeof CAT_SYNONYMS];
    prismaWhere.category = { in: [...list] }; // readonly -> string[]
  }

  if (skill && skill in SKILL_SYNONYMS) {
    const list = SKILL_SYNONYMS[skill as keyof typeof SKILL_SYNONYMS];
    prismaWhere.skill = { in: [...list] }; // readonly -> string[]
  }

  if (where === "remote" || where === "onsite") {
    prismaWhere.where = where === "onsite" ? "ONSITE" : "REMOTE";
  }
  if (type === "exclusive" || type === "multi") {
    prismaWhere.exclusive = type === "exclusive";
  }

  // ❗️დამატებული ლოგიკა:
  // ექსკლუზიური ტასკი, რომელსაც უკვე APPROVED აპლიკაცია აქვს, tasky-ზე აღარ გამოჩნდეს
  prismaWhere.NOT = {
    OR: [
      {
        AND: [
          { exclusive: true },
          { applications: { some: { status: "APPROVED" } } },
        ],
      },
      {
        AND: [
          { exclusive: false },
          { evidences: { some: { status: "APPROVED" } } },
        ],
      },
    ],
  };

  let tasks: any[] = [];
  try {
    tasks = await prisma.task.findMany({
      where: prismaWhere,
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("tasky page db error:", err);
    // fallback: ცარიელი სია, რომ გვერდი არ გადაყირავდეს
    tasks = [];
  }

  function toCardInput(db: any): TaskCardInput {
    return {
      id: db.id,
      locale,
      title: db.title,
      desc: db.desc,
      category: db.category ?? undefined,
      skill: db.skill ?? undefined,
      reward: Number(db.reward) || 0,
      deadline: db.deadline ? new Date(db.deadline).toISOString() : null,
      where: db.where === "ONSITE" ? "onsite" : "remote",
      exclusive: !!db.exclusive,
      status: db.status,
    };
  }

  const t =
    locale === "ka"
      ? {
          title: m.tasky?.title ?? "დავალებები",
          search: m.tasky?.search ?? "ძებნა…",
          loadMore: m.tasky?.loadMore ?? "მეტი ჩატვირთვა",
          filters: {
            category: "კატეგორია",
            skill: "უნარი",
            where: "ფორმატი",
            type: "ტიპი",
            all: "ყველა",
            content: "კონტენტი",
            design: "დიზაინი",
            dev: "დეველოპმენტი",
            beginner: "დამწყები",
            intermediate: "საშუალო",
            expert: "ექსპერტი",
            remote: "დისტანციური",
            onsite: "ადგილზე",
            exclusive: "ექსკლუზიური",
            multi: "არაექსკლუზიური",
            apply: "გაფილტრვა",
            reset: "გასუფთავება",
          },
          empty: "შედეგი არ მოიძებნა.",
        }
      : {
          title: m.tasky?.title ?? "Browse Tasks",
          search: m.tasky?.search ?? "Search…",
          loadMore: m.tasky?.loadMore ?? "Load more",
          filters: {
            category: "Category",
            skill: "Skill",
            where: "Location",
            type: "Type",
            all: "All",
            content: "Content",
            design: "Design",
            dev: "Development",
            beginner: "Beginner",
            intermediate: "Intermediate",
            expert: "Expert",
            remote: "Remote",
            onsite: "On-site",
            exclusive: "Exclusive",
            multi: "Multi",
            apply: "Apply",
            reset: "Reset",
          },
          empty: "No tasks found.",
        };

  const val = <T extends string>(v: T | undefined | null, fallback: T) =>
    (v as T) ?? fallback;

  return (
    <div className="space-y-6">
      {/* Title */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
        {t.title}
      </h1>

      {/* Filters */}
      <form method="get" className="card p-3 space-y-3 relative z-[200]">
        {/* search – სულ ზედა, full-width */}
        <div>
          <input
            name="q"
            defaultValue={q ?? ""}
            className="bg-transparent w-full px-3 py-2 rounded-lg outline-none placeholder:text-white/40"
            placeholder={t.search}
          />
        </div>

        {/* filters – grid, ყოველთვის ერთად */}
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* CATEGORY */}
          <div>
            <TaskyFilterSelect
              name="cat"
              size="sm"
              initialValue={val(cat, "")}
              placeholder={`${t.filters.all} ${t.filters.category}`}
              options={[
                { value: "content", label: t.filters.content },
                { value: "design", label: t.filters.design },
                { value: "dev", label: t.filters.dev },
              ]}
            />
          </div>

          {/* SKILL */}
          <div>
            <TaskyFilterSelect
              name="skill"
              size="sm"
              initialValue={val(skill, "")}
              placeholder={`${t.filters.all} ${t.filters.skill}`}
              options={[
                { value: "beginner", label: t.filters.beginner },
                { value: "intermediate", label: t.filters.intermediate },
                { value: "expert", label: t.filters.expert },
              ]}
            />
          </div>

          {/* WHERE */}
          <div>
            <TaskyFilterSelect
              name="where"
              size="sm"
              initialValue={val(where, "")}
              placeholder={`${t.filters.all} ${t.filters.where}`}
              options={[
                { value: "remote", label: t.filters.remote },
                { value: "onsite", label: t.filters.onsite },
              ]}
            />
          </div>

          {/* TYPE */}
          <div>
            <TaskyFilterSelect
              name="type"
              size="sm"
              initialValue={val(type, "")}
              placeholder={`${t.filters.all} ${t.filters.type}`}
              options={[
                { value: "exclusive", label: t.filters.exclusive },
                { value: "multi", label: t.filters.multi },
              ]}
            />
          </div>
        </div>
      </form>

      {/* Results */}
      {tasks.length === 0 ? (
        <div className="text-white/60">{t.empty}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 relative z-0">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={toCardInput(task)} />
          ))}
        </div>
      )}
    </div>
  );
}
