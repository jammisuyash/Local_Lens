'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/icons';

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/complete-profile');
    }, 2500); // 2.5-second delay

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-background">
      <div 
        style={{ animationFillMode: 'forwards' }}
        className="flex animate-in fade-in zoom-in-50 duration-1000 items-center gap-4 text-4xl font-bold font-headline"
      >
        <Logo className="h-10 w-10 text-primary" />
        <span>LocalLens</span>
      </div>
      <p 
        style={{ animationFillMode: 'forwards' }}
        className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 text-lg text-muted-foreground"
      >
        Welcome! Let's get you set up.
      </p>
    </div>
  );
}
