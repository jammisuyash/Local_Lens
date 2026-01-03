'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Loader, MapPin, Upload, FileCheck, Mail } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFirestore, useUser, setDocumentNonBlocking, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useLocation } from '@/hooks/use-location';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  phone: z.string().optional(),
  avatar: z.any().optional(),
});

export default function CompleteProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { location, error: locationError } = useLocation();

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (userProfile) {
      form.reset({ name: userProfile.name || '', phone: userProfile.phone || '' });
      if (userProfile.avatarUrl) {
        setAvatarPreview(userProfile.avatarUrl);
      }
    }
  }, [userProfile, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('avatar', file);
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to complete your profile.',
      });
      return;
    }

    setIsSubmitting(true);
    
    const userDocRef = doc(firestore, 'users', user.uid);
    
    // In a real app, you'd upload the avatar to Firebase Storage.
    // For this prototype, we'll use a random placeholder if a new one isn't uploaded.
    const avatarUrl = avatarPreview || userProfile?.avatarUrl || `https://i.pravatar.cc/150?u=${user.uid}`;
    
    const userData: any = {
      id: user.uid,
      name: values.name,
      phone: values.phone,
      email: user.email,
      avatarUrl: avatarUrl
    };

    if (location) {
      userData.latitude = location.latitude;
      userData.longitude = location.longitude;
    }

    setDocumentNonBlocking(userDocRef, userData, { merge: true });

    toast({
      title: 'Profile Updated!',
      description: 'Your profile has been successfully saved.',
    });
    
    router.push('/role-selection');
  }

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto flex max-w-sm items-center justify-center py-10 min-h-[calc(100vh-4rem)]">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Welcome! Please add your details to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24">
                      <AvatarImage src={avatarPreview || undefined} alt="Avatar Preview" />
                      <AvatarFallback className="text-3xl">{userProfile?.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <FormField
                      control={form.control}
                      name="avatar"
                      render={({ field }) => (
                          <FormItem>
                              <FormControl>
                                  <label className="cursor-pointer text-sm font-medium text-primary underline-offset-4 hover:underline">
                                      <span>Change Photo</span>
                                      <Input
                                          type="file"
                                          accept="image/*"
                                          className="sr-only"
                                          onChange={handleFileChange}
                                      />
                                  </label>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                  <FormLabel>Email</FormLabel>
                  <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={user?.email || ''} disabled className="pl-9" />
                  </div>
              </FormItem>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 555-123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Location</FormLabel>
                <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-muted-foreground">
                  <MapPin className="h-5 w-5 text-primary" />
                  {location && <span className="text-sm">Your location is successfully tagged.</span>}
                  {locationError && <span className="text-sm text-destructive">Could not get location: {locationError.message}</span>}
                  {!location && !locationError && <span className="text-sm">Getting your location...</span>}
                </div>
              </FormItem>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Save and Continue
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
