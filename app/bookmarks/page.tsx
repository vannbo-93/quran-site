import type { Metadata } from "next";
import { BookmarksList } from "./BookmarksList";

export const metadata: Metadata = {
  title: "المحفوظات",
  description: "السور والآيات التي حفظتها للعودة إليها.",
  robots: { index: false }, // personal page, content lives in the visitor's browser
};

export default function BookmarksPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 pt-12 pb-20 sm:px-6">
      <h1 className="font-arabic text-3xl font-medium">المحفوظات</h1>
      <p className="mt-2 font-arabic text-sm text-white/40">
        محفوظة في هذا المتصفح فقط، ولا تظهر على جهاز آخر.
      </p>
      <BookmarksList />
    </main>
  );
}
