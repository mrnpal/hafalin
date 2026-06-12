import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // <-- INI YANG PALING PENTING BRO

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HafalIn - For Nilam',
  description: 'Personal Memorization Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}