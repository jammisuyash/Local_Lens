'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HandHeart, Megaphone, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/icons';

export default function RoleSelectionPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto flex max-w-2xl flex-col items-center justify-center py-10 min-h-[calc(100vh-4rem)]">
        <div 
          className="flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-8 duration-700"
        >
          <div className="flex items-center gap-3 text-4xl font-bold font-headline mb-4">
              <Logo className="h-10 w-10 text-primary" />
              <span>Welcome to LocalLens!</span>
          </div>
          <p className="text-lg text-muted-foreground mb-8">You're all set. How would you like to start?</p>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
            <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow bg-card">
                <HandHeart className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Join the Action</h3>
                <p className="text-muted-foreground text-sm mb-6 flex-grow">
                    Become a local hero. Find volunteer opportunities and join teams to make a real difference.
                </p>
                <Button className="w-full" onClick={() => router.push('/volunteer-hub')}>
                    Go to Volunteer Hub <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
            <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow bg-card">
                <Megaphone className="h-12 w-12 text-accent-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">See What's Happening</h3>
                <p className="text-muted-foreground text-sm mb-6 flex-grow">
                    Explore the community feed, see nearby issues, and report problems you find.
                </p>
                <Button variant="secondary" className="w-full" onClick={() => router.push('/')}>
                    Explore the Feed <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    </div>
  );
}
