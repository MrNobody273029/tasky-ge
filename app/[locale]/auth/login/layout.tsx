// app/[locale]/auth/layout.tsx

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
  params: { locale: 'ka' | 'en' };
}) {
  return <main className="container-page px-6 py-10">{children}</main>;
}
