// The site's public address, used for share links and preview images.
// Set NEXT_PUBLIC_SITE_URL when the real domain is connected; until then Vercel's production URL is used.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE_NAME = "القرآن الكريم";
export const SITE_DESCRIPTION =
  "اقرأ القرآن الكريم بالرسم العثماني واستمع إليه بأصوات كبار القرّاء، مع الترجمة الإنجليزية والتفسير الميسر وألوان التجويد. مجاني وبلا إعلانات.";
