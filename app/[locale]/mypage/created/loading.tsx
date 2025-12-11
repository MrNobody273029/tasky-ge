// მაგ: app/[locale]/mypage/applications/loading.tsx
import MatrixLoader from "@/components/MatrixLoader";

export default function CreatedLoading() {
  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/80">
      <MatrixLoader />
    </div>
  );
}
