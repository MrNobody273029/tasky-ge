import { redirect } from 'next/navigation';

export default function MyPageIndex({
  params,
}: {
  params: { locale: 'ka' | 'en' };
}) {
  // პირდაპირ Published ტაბზე გადავდივართ
  redirect(`/${params.locale}/mypage/created?tab=published`);
}
