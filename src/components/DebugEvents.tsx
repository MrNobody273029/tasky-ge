// src/components/DebugEvents.tsx
'use client';
import { useEffect } from 'react';

export default function DebugEvents() {
  useEffect(() => {
    const onErr = (e: ErrorEvent) => console.error('window.onerror:', e.message, e.error);
    const onRej = (e: PromiseRejectionEvent) => console.error('unhandledrejection:', e.reason);
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, []);
  return null;
}
