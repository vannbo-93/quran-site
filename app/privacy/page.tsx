import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "الخصوصية",
  description: "ما يحفظه موقع القرآن الكريم وما لا يحفظه: لا حسابات، لا ملفات تعريف ارتباط، لا إعلانات.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-11-27";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "باختصار",
    body: (
      <>
        لا يطلب الموقع أي حساب أو تسجيل، ولا يستعمل ملفات تعريف الارتباط (cookies)، ولا يعرض إعلانات، ولا يبيع أي
        بيانات أو يشاركها.
      </>
    ),
  },
  {
    title: "ما يُحفظ في متصفحك فقط",
    body: (
      <>
        يحفظ الموقع بعض الإعدادات في متصفحك (localStorage) لكي تجدها عند عودتك: حجم الخط ووضع العرض والقارئ ومستوى
        الصوت والسرعة، والوضع الفاتح أو الداكن، وآخر موضع قراءة، و
        <Link href="/bookmarks" className="text-accent underline-offset-4 hover:underline">
          المحفوظات
        </Link>
        . هذه البيانات لا تُرسل إلى أي خادم، ويمكنك حذفها في أي وقت بمسح بيانات الموقع من إعدادات المتصفح.
      </>
    ),
  },
  {
    title: "إحصاء الزيارات",
    body: (
      <>
        نستعمل Vercel Web Analytics لمعرفة عدد الزيارات والصفحات الأكثر قراءة ومصدر الزيارة (مثل محرك بحث أو موقع
        آخر). هذا الإحصاء مجهول الهوية: لا يستعمل ملفات تعريف الارتباط، ولا يتعرف على الزائر نفسه.
      </>
    ),
  },
  {
    title: "التلاوات والخدمات الخارجية",
    body: (
      <>
        ملفات التلاوة تأتي مباشرة من EveryAyah.com و MP3Quran.net، فيصل طلب الملف إلى خوادمهم كما يحدث عند فتح أي
        ملف صوتي على الإنترنت. الموقع مستضاف على Vercel، ونص القرآن والترجمة والتفسير مخزّنة في Supabase. لكل خدمة
        من هذه سياسة خصوصية خاصة بها.
      </>
    ),
  },
  {
    title: "المصادر",
    body: (
      <>
        مصادر النص والترجمة والتفسير والتلاوات وتراخيصها في صفحة{" "}
        <Link href="/about" className="text-accent underline-offset-4 hover:underline">
          عن الموقع
        </Link>
        .
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-12 pb-20 font-arabic sm:px-6">
      <h1 className="text-3xl font-medium">الخصوصية</h1>
      <p className="mt-2 text-sm text-white/40">
        آخر تحديث: <time dateTime={UPDATED}>{new Date(UPDATED).toLocaleDateString("ar-MA", { dateStyle: "long" })}</time>
      </p>

      <div className="mt-10 space-y-4">
        {SECTIONS.map((s) => (
          <section key={s.title} className="glass rounded-2xl p-6">
            <h2 className="text-lg">{s.title}</h2>
            <p className="mt-2 leading-loose text-white/70">{s.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
