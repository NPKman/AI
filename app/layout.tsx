import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin', 'thai'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'EVMS Charger Dashboard',
  description: 'แดชบอร์ดติดตามสถานีชาร์จและจัดการคำสั่งควบคุมแบบเรียลไทม์'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col bg-slate-50">
            <header className="border-b bg-white">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  ระบบติดตามสถานีชาร์จ EV
                </h1>
                <span className="text-sm text-muted-foreground">Asia/Bangkok</span>
              </div>
            </header>
            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
