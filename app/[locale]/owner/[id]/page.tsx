import {owner, task} from '@/data/mock';
import Link from 'next/link';

export default function OwnerPublic({params}:{params:{locale:string, id:string}}){
  return (
    <div className="space-y-6">
      <header className="card p-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{owner.name}</h1>
          <div className="text-white/70 text-sm">{owner.location} • Languages: {owner.languages.join(', ')} • Since {owner.since}</div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg bg-cyan text-black font-semibold">Message</button>
          <button className="px-4 py-2 rounded-lg border border-white/20">Follow</button>
        </div>
      </header>
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-3">Tasks</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link href={`/${params.locale}/task/${task.id}`} className="card p-4 hover:bg-white/5">
            <div className="flex justify-between"><div className="font-semibold">{task.title}</div><div className="text-cyan font-semibold">₾{task.reward}</div></div>
            <div className="text-white/70 text-sm line-clamp-2">{task.description}</div>
          </Link>
        </div>
      </div>
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-3">Reviews</h2>
        <div className="space-y-4">
          <div className="card p-4">
            <div className="font-semibold">Clear scope & fast payment</div>
            <div className="text-white/70 text-sm">Worked smoothly; feedback was concise. Would collaborate again.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
