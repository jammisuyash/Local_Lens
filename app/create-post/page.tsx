'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import type { Category, Post } from '@/lib/types';
import { Loader, MapPin, Upload, FileCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from '@/hooks/use-location';
import { prioritizeIssue } from '@/ai/ai-issue-prioritization';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';

const categories: Category[] = [
  'Garbage',
  'Potholes',
  'Water Issue',
  'Lost & Found',
  'Event',
  'News',
  'Other',
];

const formSchema = z.object({
  title: z.string().min(5, {
    message: 'Title must be at least 5 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  category: z.enum(categories),
  image: z.any().optional(),
});

export default function CreatePostPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { location, error: locationError, getLocation } = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!location) {
      toast({
        variant: 'destructive',
        title: 'Location not found',
        description: 'We could not determine your location. Please try again.',
      });
      getLocation();
      return;
    }
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to create a post.',
      });
      return;
    }

    setIsSubmitting(true);

    const { urgencyLevel } = await prioritizeIssue({
      category: values.category,
      title: values.title,
      description: values.description,
    });

    const randomImage = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];

    const newPost: Omit<Post, 'id'> = {
      authorId: user.uid,
      category: values.category,
      title: values.title,
      description: values.description,
      imageUrl: randomImage.imageUrl,
      imageHint: randomImage.imageHint,
      lat: location.latitude,
      lng: location.longitude,
      upvotes: 0,
      volunteers: 0,
      timestamp: new Date(),
      urgency: urgencyLevel,
      status: 'open',
    };

    if (firestore) {
      const postsCollection = collection(firestore, 'posts');
      addDocumentNonBlocking(postsCollection, newPost);
      
      toast({
        title: 'Post Created!',
        description: 'Your post is now live for the community to see.',
      });
      
      router.push('/');
    } else {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not connect to the database. Please try again.',
      });
      setIsSubmitting(false);
    }
  }

  if (!isClient || isUserLoading) {
    return (
        <div className="container mx-auto max-w-lg py-10">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg py-10">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Create a New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Large pothole on Main St" {...field} />
                    </FormControl>
                    <FormDescription>
                      A short, descriptive title for your post.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell the community more about what's happening..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <label className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground">
                            <Upload className="h-4 w-4" />
                            <span>{selectedFileName ? 'Change file' : 'Upload an image'}</span>
                            <Input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                field.onChange(file);
                                setSelectedFileName(file?.name || null);
                              }}
                            />
                        </label>
                        {selectedFileName && (
                          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                            <FileCheck className="h-5 w-5 shrink-0 text-green-500" />
                            <span className="truncate">{selectedFileName}</span>
                          </div>
                        )}
                      </div>
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

              <Button type="submit" disabled={isSubmitting || !location || !user}>
                {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                Submit Post
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
