import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'PandaPay Admin',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
