'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { useMe } from '@/hooks/use-me';

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { data: me } = useMe();

  useEffect(() => {
    if (me?.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [me?.mustChangePassword, router]);

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar className="hidden md:flex shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
