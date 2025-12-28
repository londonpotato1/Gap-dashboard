import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gap Dashboard - 암호화폐 갭 모니터링',
  description: '거래소 간 현물-선물 및 선물-선물 가격 갭을 실시간으로 모니터링',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
