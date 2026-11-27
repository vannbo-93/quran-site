import { tajweedSegments, type TajweedAnnotation } from "@/lib/tajweed";

// Ayah text with tajweed spans. The colors only show when the reader turns tajweed on
// (CSS: .reader[data-tajweed="on"] .tj-*), so the text is the same either way.
export function TajweedText({
  text,
  annotations,
  shift = 0,
}: {
  text: string;
  annotations: TajweedAnnotation[] | null;
  shift?: number;
}) {
  return (
    <>
      {tajweedSegments(text, annotations, shift).map((s, i) =>
        s.group ? (
          <span key={i} className={`tj tj-${s.group}`}>
            {s.text}
          </span>
        ) : (
          s.text
        ),
      )}
    </>
  );
}
