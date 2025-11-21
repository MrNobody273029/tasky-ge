// app/[locale]/task/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function TaskPublic({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      author: true, // owner ბლოკისთვის
    },
  });

  if (!task) return notFound();

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="card p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold">{task.title}</h1>
            <div className="px-3 py-1 rounded-full bg-cyan/20 text-cyan font-semibold">
              ₾{task.reward}
            </div>
          </div>

          <div className="text-white/70">{task.desc}</div>

          <div className="card p-4">
            <details open>
              <summary className="cursor-pointer font-semibold">
                Deliverables & Evidence Required
              </summary>
              <ul className="list-disc list-inside text-white/80">
                <li>strings.en.json</li>
                <li>Change log</li>
                <li>Links to preview</li>
              </ul>
            </details>
          </div>

          <div className="flex justify-end gap-3">
            <button className="px-5 py-3 rounded-xl bg-cyan text-black font-semibold shadow-neon">
              Apply to this Task
            </button>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-4">
          <div className="font-semibold">Owner</div>
          <Link
            href={`/${params.locale}/owner/${task.authorId}`}
            className="text-cyan hover:underline"
          >
            {task.author?.name ?? "Owner"}
          </Link>
          {/* ლოკაცია User-ში ჯერ არ გვაქვს სქემაში, ამიტომ დროებით ვტოვებთ ცარიელს */}
          <div className="text-white/70 text-sm"></div>
        </div>

        <div className="card p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Type</div>
            <div className="text-white/70">{task.where}</div>
            <div>Skill</div>
            <div className="text-white/70">{task.skill}</div>
            <div>Language</div>
            <div className="text-white/70">{task.locale}</div>
            <div>Due</div>
            <div className="text-white/70">
              {task.deadline ? new Date(task.deadline).toLocaleDateString() : "-"}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
