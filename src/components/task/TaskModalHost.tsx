// src/components/task/TaskModalHost.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import TaskModal from "./TaskModal";

type OpenEvt = CustomEvent<{ id: string }>;

export default function TaskModalHost() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  // გახსნა custom event-ით: window.dispatchEvent(new CustomEvent('open-task-modal', { detail:{ id } }))
  useEffect(() => {
    const onOpen = (e: Event) => {
      const ce = e as OpenEvt;
      const id = ce?.detail?.id;
      if (!id) return;

      setTaskId(id);
      setOpen(true);

      // URL-ში ასახვა (?task=) — რომ refresh/back-ზე დაიჭიროს
      const qs = new URLSearchParams(search.toString());
      qs.set("task", id);
      router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
    };

    window.addEventListener("open-task-modal", onOpen as EventListener);
    return () => window.removeEventListener("open-task-modal", onOpen as EventListener);
  }, [pathname, router, search]);

  // გახსნა URL (?task=) ან localStorage('tasky.openTask')-იდან; back/forward მხარდაჭერა
  useEffect(() => {
    const idFromUrl = search.get("task");
    let idFromLS: string | null = null;

    if (typeof window !== "undefined") {
      idFromLS = localStorage.getItem("tasky.openTask");
      if (idFromLS) {
        try { localStorage.removeItem("tasky.openTask"); } catch {}
      }
    }

    const id = idFromUrl || idFromLS;
    if (id && id !== taskId) {
      setTaskId(id);
      setOpen(true);
    }

    // თუ URL-იდან წაიშალა ?task — მოდალი დაიხუროს (back-ის შემთხვევაში)
    if (!idFromUrl && open) {
      setOpen(false);
      setTaskId(null);
    }
  }, [search, open, taskId]);

  const handleClose = () => {
    setOpen(false);
    setTaskId(null);

    // URL-დან ?task წაშლა
    const qs = new URLSearchParams(search.toString());
    qs.delete("task");
    router.replace(`${pathname}${qs.toString() ? `?${qs.toString()}` : ""}`, { scroll: false });
  };

  return <TaskModal open={open} taskId={taskId} onClose={handleClose} />;
}
