// app/[locale]/task/[id]/submit-proof/page.tsx

type Props = {
  params: { locale: "ka" | "en"; id: string };
};

export default function SubmitProofPage({ params }: Props) {
  const { locale, id } = params;
  const isKa = locale === "ka";

  return (
    <div className="container-page py-8 space-y-4">
      <h1 className="text-2xl font-bold">
        {isKa ? "მტკიცებულებების გაგზავნა" : "Submit evidence"}
      </h1>

      <p className="text-white/70 text-sm">
        {isKa
          ? `დროებითი გვერდი ტასკისთვის ID: ${id}. მერე აქ დავამატებთ ფორმას.`
          : `Temporary page for task ID: ${id}. We'll add the real form later.`}
      </p>
    </div>
  );
}
