'use client';

// გლობალური მოვლენა, რომელსაც TaskModalHost უსმენს
export function openTaskModal(id: string) {
  if (!id) return;
  const ev = new CustomEvent('open-task-modal', { detail: { id } });
  window.dispatchEvent(ev);
}
