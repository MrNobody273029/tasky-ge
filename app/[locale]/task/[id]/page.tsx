import {owner, task as mock} from '@/data/mock';
import Link from 'next/link';

export default function TaskPublic({params}:{params:{locale:string, id:string}}){
  const task = {...mock, locale: params.locale};
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="card p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold">{task.title}</h1>
            <div className="px-3 py-1 rounded-full bg-cyan/20 text-cyan font-semibold">₾{task.reward}</div>
          </div>
          <div className="text-white/70">{task.description}</div>
          <div className="card p-4">
            <details open>
              <summary className="cursor-pointer font-semibold">Deliverables & Evidence Required</summary>
              <ul className="list-disc list-inside text-white/80">
                <li>strings.en.json</li>
                <li>Change log</li>
                <li>Links to preview</li>
              </ul>
            </details>
          </div>
          <div className="flex justify-end gap-3">
            <button className="px-5 py-3 rounded-xl bg-cyan text-black font-semibold shadow-neon">Apply to this Task</button>
          </div>
        </div>
      </div>
      <aside className="space-y-4">
        <div className="card p-4">
          <div className="font-semibold">Owner</div>
          <Link href={`/${params.locale}/owner/${owner.id}`} className="text-cyan hover:underline">{owner.name}</Link>
          <div className="text-white/70 text-sm">{owner.location}</div>
        </div>
        <div className="card p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Type</div><div className="text-white/70">{task.type}</div>
            <div>Skill</div><div className="text-white/70">{task.skill}</div>
            <div>Language</div><div className="text-white/70">{task.language}</div>
            <div>Due</div><div className="text-white/70">{task.due}</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
