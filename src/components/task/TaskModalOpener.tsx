'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TaskModal from '@/components//task/TaskModal'; // ← თუ გზა სხვა გაქვს, დაასწორე

export default function TaskModalOpener({ locale }: { locale: 'ka' | 'en' }) {
  const router = useRouter();
  const search = useSearchParams();

  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  // თუ URL-შია ?task= ან localStorage-ში დაგვრჩა – გავხსნათ მოდალი
  useEffect(() => {
    const fromUrl = search.get('task');
    const fromLS =
      typeof window !== 'undefined' ? localStorage.getItem('tasky.openTask') : null;

    const id = fromUrl || fromLS;
    if (id) {
      setTaskId(id);
      setOpen(true);
      try { localStorage.removeItem('tasky.openTask'); } catch {}
    }
  }, [search]);

  // დახურვა: URL-დან ?task წაიშალოს, რომ განახლებაზე აღარ გაიხსნას
  const handleClose = () => {
    setOpen(false);
    setTaskId(null);

    const qs = new URLSearchParams(search.toString());
    qs.delete('task');
    router.replace(`/${locale}${qs.toString() ? `?${qs.toString()}` : ''}`, {
      scroll: false,
    });
  };

  return (
    <TaskModal open={open} taskId={taskId} onClose={handleClose} />
  );
}
