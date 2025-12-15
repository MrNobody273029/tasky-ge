'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreatedAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();

    window.addEventListener('focus', refresh);
    window.addEventListener('tasky:tasks-updated', refresh as EventListener);

    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('tasky:tasks-updated', refresh as EventListener);
    };
  }, [router]);

  return null;
}
