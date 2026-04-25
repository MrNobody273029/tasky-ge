'use client';
import React, { useCallback, useState } from 'react';
import HoloLogoSVG from '@/components/TaskyLogoDraw';            // <- შეცვალე ბილიკი საჭიროებისამებრ
import TaskModal from '@/components/task/TaskModal';            // <- იგივე

export default function LogoWithModalTrigger() {
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resetTick, setResetTick] = useState(0);

  const onExplode = useCallback(async () => {
    try {
      const r = await fetch('/api/tasks/random-published', { cache: 'no-store' });
      if (!r.ok) throw new Error('No tasks');
      const { id } = await r.json() as { id: string };
      setTaskId(id);
      setOpen(true);
    } catch (e) {
      console.error(e);
      setTaskId(null);
      setOpen(true);
    }
  }, []);

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
