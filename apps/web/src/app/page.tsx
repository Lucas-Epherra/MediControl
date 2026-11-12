'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FullScreenLoader } from '@/components/full-screen-loader';
import { useSession } from '@/lib/session';

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/grupos');
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  return <FullScreenLoader />;
}
