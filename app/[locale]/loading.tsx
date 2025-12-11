// app/[locale]/loading.tsx

import CyberBG from '@/components/CyberBG';
import MatrixLoader from '@/components/MatrixLoader';

export default function LocaleLoading() {
  return (
    <>
      {/* фонად वही, რაც საიტზე */}
      <CyberBG />

      {/* ზედ ზუსტად ჩვენი ახალი ლოადერი */}
      <MatrixLoader />
    </>
  );
}
