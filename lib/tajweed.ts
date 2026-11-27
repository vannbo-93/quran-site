// Tajweed colors: rule annotations → color groups → text segments.
// Shared by the server (surah page) and the client (legend).

// [start, end, rule]: character offsets in ayahs.text_uthmani, end excluded
export type TajweedAnnotation = [number, number, string];

export type TajweedGroup = "silent" | "madd2" | "madd-jaiz" | "madd-wajib" | "madd-lazim" | "ghunnah" | "qalqalah";

// Each rule of the data set → the color group shown in the legend
const RULE_GROUP: Record<string, TajweedGroup> = {
  hamzat_wasl: "silent",
  lam_shamsiyyah: "silent",
  silent: "silent",
  idghaam_no_ghunnah: "silent",
  idghaam_mutajanisayn: "silent",
  idghaam_mutaqaribayn: "silent",
  madd_2: "madd2",
  madd_246: "madd-jaiz",
  madd_munfasil: "madd-jaiz",
  madd_muttasil: "madd-wajib",
  madd_6: "madd-lazim",
  ghunnah: "ghunnah",
  ikhfa: "ghunnah",
  ikhfa_shafawi: "ghunnah",
  idghaam_ghunnah: "ghunnah",
  idghaam_shafawi: "ghunnah",
  iqlab: "ghunnah",
  qalqalah: "qalqalah",
};

// Legend, in reading order
export const TAJWEED_LEGEND: { group: TajweedGroup; ar: string; en: string }[] = [
  { group: "silent", ar: "لا يُنطق", en: "Silent letter" },
  { group: "madd2", ar: "مد طبيعي (2)", en: "Normal madd (2)" },
  { group: "madd-jaiz", ar: "مد منفصل وعارض (2/4/6)", en: "Separated madd (2/4/6)" },
  { group: "madd-wajib", ar: "مد متصل (4/5)", en: "Connected madd (4/5)" },
  { group: "madd-lazim", ar: "مد لازم (6)", en: "Necessary madd (6)" },
  { group: "ghunnah", ar: "غنة / إخفاء", en: "Ghunna/ikhfa'" },
  { group: "qalqalah", ar: "قلقلة", en: "Qalqala (echo)" },
];

export type TajweedSegment = { text: string; group: TajweedGroup | null };

// Split a displayed ayah into colored segments.
// shift: characters removed from the start of the stored text for display (the basmala).
export function tajweedSegments(
  displayed: string,
  annotations: TajweedAnnotation[] | null,
  shift = 0,
): TajweedSegment[] {
  const chars = Array.from(displayed);
  if (!annotations?.length) return [{ text: displayed, group: null }];

  const groups: (TajweedGroup | null)[] = new Array(chars.length).fill(null);
  for (const [start, end, rule] of annotations) {
    const group = RULE_GROUP[rule];
    if (!group) continue;
    for (let i = Math.max(0, start - shift); i < Math.min(chars.length, end - shift); i++) groups[i] = group;
  }

  const segments: TajweedSegment[] = [];
  chars.forEach((ch, i) => {
    const last = segments.at(-1);
    if (last && last.group === groups[i]) last.text += ch;
    else segments.push({ text: ch, group: groups[i] });
  });
  return segments;
}
