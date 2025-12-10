// app/[locale]/auth/layout.tsx
import AudioUnlock from '@/components/AudioUnlock';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
  params: { locale: 'ka' | 'en' };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <AudioUnlock />
      {/* აქ ვზღუდავთ სიგანეს, რომ კვადრატი არც ზედმეტად ფართო იყოს, არც ვიწრო */}
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl">
        {children}
      </div>
    </main>
  );
}
