export const metadata = {
  title: 'נועם — מתכנן פיננסי AI',
  description: 'צ׳אט חכם לתכנון פיננסי מקיף: השקעות, פנסיה, ביטוח, משכנתא ומיסים',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
