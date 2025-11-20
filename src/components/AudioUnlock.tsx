'use client';
import { useEffect } from 'react';

export default function AudioUnlock() {
  useEffect(() => {
    const unlock = async () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      try {
        // ერთი "ნამდვილ" ჟესტზე ჩუმად ვუკრავთ 1 ფაილს და ვაჩერებთ —
        // ამის შემდეგ ყველა დანარჩენი ავტონომიურად იმუშავებს.
        const a = new Audio('/sfx/login.mp3'); // არსებობს შენს public/sfx-ში
        a.muted = true;
        await a.play().catch(() => {});
        a.pause(); a.currentTime = 0; a.muted = false;
      } catch {}
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown',  unlock, { once: true });
  }, []);
  return null;
}
