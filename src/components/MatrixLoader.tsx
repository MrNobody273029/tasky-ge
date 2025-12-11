'use client';

import React, { useEffect, useState } from 'react';

export default function MatrixLoader() {
  const [srcBust, setSrcBust] = useState('');

  // ყოველი mount-ზე ახალი query => SVG თავიდან ჩაიტვირთოს და თავიდან დახატოს
  useEffect(() => {
    setSrcBust(`/loader.svg?t=${Date.now()}`);
  }, []);

  return (
    <div className="loader-screen fixed inset-0 z-[2147483647] flex items-center justify-center">
      {/* 👉 იგივე ბექგრაუნდი, რაც CyberBG-ում გაქვს */}
      <div className="absolute inset-0 cyberbg_vignette" />
      <div className="absolute inset-0 cyberbg_grid" />

      {/* content ფენა – ლოგო ცენტრში */}
      <div className="relative flex items-center justify-center">
        <div
          className="loader-wrapper flex items-center justify-center"
          style={{
            border: 'none',
            animation: 'none',        // ძველი სპინერი გამორთული
            width: 'min(70vw, 360px)', // 🔥 აქედან იზრდება ზომა
            height: 'min(70vw, 360px)',
            borderRadius: 0,
          }}
        >
          {srcBust && (
            <img
              src={srcBust}
              alt="Tasky loading"
              className="w-full h-full" // ავსებს wrapper-ს
            />
          )}
        </div>
      </div>
    </div>
  );
}
