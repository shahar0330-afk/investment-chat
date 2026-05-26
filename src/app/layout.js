export const metadata = {
  title: 'יועץ השקעות AI',
  description: 'צ׳אט חכם לבניית תיק השקעות מותאם אישית',
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
