import { redirect } from 'next/navigation';

export default function Page({ params }: { params: { locale: 'ka' | 'en' } }) {
  // /ka/home -> /ka  და /en/home -> /ენ
  redirect(`/${params.locale}`);
}
