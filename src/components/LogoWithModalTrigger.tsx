'use client';
import React, { useCallback, useMemo, useState } from 'react';
import HoloLogoSVG from '@/components/TaskyLogoDraw';            // <- შეცვალე ბილიკი საჭიროებისამებრ
import TaskModal from '@/components/task/TaskModal';            // <- იგივე

type TaskListItem = { id: string; status: 'DRAFT' | 'PUBLISHED' };

export default function LogoWithModalTrigger() {
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resetTick, setResetTick] = useState(0);

  const pickRandom = useCallback(<T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)], []);

  const onExplode = useCallback(async () => {
    // სცადე გამოიტანო ნებისმიერი გამოქვეყნებული დავალება
    try {
      const r = await fetch('/api/tasks?status=PUBLISHED&limit=200', { cache: 'no-store' });
      if (!r.ok) throw new Error('Failed to fetch tasks');
      const list = (await r.json()) as TaskListItem[];
      const published = list.filter(t => t.status === 'PUBLISHED');
      const chosen = pickRandom(published);
      if (!chosen) throw new Error('No published tasks');
      setTaskId(chosen.id);
      setOpen(true);
    } catch (e) {
      // ფოლბექი: თუ API ვერ იმუშავა, გახსენი მოდალი null-ზე (შენი TaskModal null-ზე არაფერს გამოიტანს)
      console.error(e);
      setTaskId(null);
      setOpen(true);
    }
  }, [pickRandom]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // ლოგოს აღდგენა
    setResetTick(v => v + 1);
  }, []);

  return (
    <>
      <div className="flex items-center justify-center py-8">
        <HoloLogoSVG
          src="/logo.svg"
          size={280}
          spin
          spinSpeedSec={8}
          maxMulHover={40}
          accelPerSec={7}
          decelPerSec={4}
          onExplode={onExplode}
          resetOn={resetTick}
        />
      </div>

      <TaskModal open={open} taskId={taskId} onClose={handleClose} />
    </>
  );
}
