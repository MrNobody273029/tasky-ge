import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import TaskCard, { TaskCardInput } from "@/components/TaskCard";

type Locale = "ka" | "en";

// საერთო ტიპი ბეჯისთვის
type ItemFlag = "pending" | "rejected" | "approved" | undefined;

type Item = {
  task: TaskCardInput;
  flag: ItemFlag;
  createdAt: Date; // როდის აიღო / გააგზავნა მოთხოვნა
};

function getUserIdFromCookies(): string {
  const c = cookies().get("x-user-id")?.value?.trim();
  return c && c.length > 0 ? c : "guest";
}

export default async function Taken({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  const t =
    locale === "ka"
      ? {
          title: "ჩემი აღებული დავალებები",
          empty: "ჯერ არ აგიღია დავალებები.",
          pending: "ელოდება დამკვეთის დასტურს",
          rejected: "თქვენი მოთხოვნა უარყოფილია",
          approved: "დადასტურებულია",
        }
      : {
          title: "My Taken Tasks",
          empty: "You haven’t taken any tasks yet.",
          pending: "Waiting for client's approval",
          rejected: "Your application was rejected",
          approved: "Approved",
        };

  const userId = getUserIdFromCookies();

  /* ------ helper: DB -> TaskCardInput ------ */
  const toCardInput = (db: any): TaskCardInput => ({
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
  });

  /* ------ approved/taken (claims) ------ */
  const claims = await prisma.taskClaim.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { task: true },
  });

  const takenItems: Item[] = claims
    .filter((c) => !!c.task)
    .map((c): Item => {
      const task = c.task as any;
      const isExclusive = !!task?.exclusive; // მხოლოდ ექსკლუზიურს ვუთითებთ მწვანე ბეჯს

      return {
        task: toCardInput(task),
        flag: isExclusive ? "approved" : undefined,
        createdAt: c.createdAt, // როდის აიღო/დაემატა claim
      };
    });

  /* ------ my exclusive applications (pending / rejected) ------ */
  const apps = await prisma.taskApplication.findMany({
    where: {
      applicantId: userId,
      status: { in: ["PENDING", "REJECTED"] },
      task: { exclusive: true },
    },
    orderBy: { createdAt: "desc" },
    include: { task: true },
  });

  const claimedIds = new Set(takenItems.map((i) => i.task.id));

  const appItems: Item[] = apps
    .filter((a) => a.task && !claimedIds.has(a.taskId))
    .map((a): Item => ({
      task: toCardInput(a.task as any),
      flag: a.status === "PENDING" ? "pending" : "rejected",
      createdAt: a.createdAt, // როდის გაგზავნა მოთხოვნა
    }));

  // 🔥 საბოლოო სია: ყველაფერი ერთად, დალაგებული createdAt-ით (უახლესი მარცხნივ/პირველი)
  const items: Item[] = [...appItems, ...takenItems].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t.title}</h1>

      {items.length === 0 ? (
        <div className="card p-6 text-white/70">{t.empty}</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {items.map(({ task, flag }) => (
            <TaskCard
              key={task.id}
              task={task}
              statusBadge={
                !flag
                  ? undefined
                  : flag === "pending"
                  ? { kind: "pending", text: t.pending }
                  : flag === "rejected"
                  ? { kind: "rejected", text: t.rejected }
                  : { kind: "approved", text: t.approved }
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
