'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // სრულ სტეკს დავბეჭდავთ
    // @ts-ignore
    console.error('GLOBAL ERROR:', error?.stack || error);
  }, [error]);

  return (
    <html>
      <body style={{padding:16, fontFamily:'ui-sans-serif', background:'#000', color:'#fff'}}>
        <div style={{border:'1px solid #f33', padding:16, borderRadius:8, background:'#220'}}>
          <div style={{fontWeight:700, color:'#f66', marginBottom:8}}>App crashed</div>
          <pre style={{whiteSpace:'pre-wrap'}}>{String(error?.stack || error)}</pre>
          <button
            onClick={() => reset()}
            style={{marginTop:12, padding:'8px 12px', background:'#f66', color:'#000', borderRadius:6}}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
