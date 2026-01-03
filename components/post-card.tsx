'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ThumbsUp,
  HandHeart,
  MapPin,
  Trash2,
  Construction,
  Droplets,
  Search,
  CalendarDays,
  Newspaper,
  AlertTriangle,
  Globe,
  CheckCircle2,
  Wrench,
  Circle,
  Upload,
  FileCheck,
  Loader,
} from 'lucide-react';
import type { PostWithDistance, Category, User } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useLocation } from '@/hooks/use-location';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from 'react-compare-slider';

interface PostCardProps {
  post: PostWithDistance;
  isGlobalFeed?: boolean;
}

const categoryIcons: Record<Category, React.ReactNode> = {
  Garbage: <Trash2 className="h-4 w-4" />,
  Potholes: <Construction className="h-4 w-4" />,
  'Water Issue': <Droplets className="h-4 w-4" />,
  'Lost & Found': <Search className="h-4 w-4" />,
  Event: <CalendarDays className="h-4 w-4" />,
  News: <Newspaper className="h-4 w-4" />,
  Other: <AlertTriangle className="h-4 w-4" />,
};

const categoryColors: Record<Category, string> = {
    Garbage: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
    Potholes: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700',
    'Water Issue': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
    'Lost & Found': 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
    Event: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700',
    News: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700',
    Other: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600',
};

const statusInfo = {
  open: { icon: <Circle className="h-4 w-4" />, text: 'Open', color: 'text-gray-500' },
  in_progress: { icon: <Wrench className="h-4 w-4" />, text: 'In Progress', color: 'text-blue-500 animate-pulse' },
  resolved: { icon: <CheckCircle2 className="h-4 w-4" />, text: 'Resolved', color: 'text-green-500' },
};


export default function PostCard({ post, isGlobalFeed }: PostCardProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const { location } = useLocation();
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolvedImageFile, setResolvedImageFile] = useState<File | null>(null);
  const [resolvedImagePreview, setResolvedImagePreview] = useState<string | null>(null);
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  const authorRef = useMemo(() => {
    if (!firestore || !post.authorId) return null;
    return doc(firestore, 'users', post.authorId);
  }, [firestore, post.authorId]);
  
  const { data: author } = useDoc<User>(authorRef);

  const resolverRef = useMemo(() => {
    if (!firestore || !post.resolvedBy) return null;
    return doc(firestore, 'users', post.resolvedBy);
  }, [firestore, post.resolvedBy]);

  const { data: resolver } = useDoc<User>(resolverRef);
  
  const upvoteRef = useMemo(() => user && firestore ? doc(firestore, 'posts', post.id, 'upvotes', user.uid) : null, [firestore, post.id, user]);
  const { data: upvote } = useDoc(upvoteRef);
  
  const volunteerRef = useMemo(() => user && firestore ? doc(firestore, 'posts', post.id, 'volunteers', user.uid) : null, [firestore, post.id, user]);
  const { data: volunteer } = useDoc(volunteerRef);

  const isUpvoted = !!upvote;
  const isVolunteered = !!volunteer;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResolvedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setResolvedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpvote = async () => {
    if (!user || !upvoteRef || !firestore) return;

    const postRef = doc(firestore, 'posts', post.id);

    try {
      await runTransaction(firestore, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) {
            throw "Post does not exist!";
        }

        const currentUpvotes = postDoc.data().upvotes || 0;

        if (isUpvoted) {
            transaction.delete(upvoteRef);
            transaction.update(postRef, { upvotes: Math.max(0, currentUpvotes - 1) });
        } else {
            transaction.set(upvoteRef, { userId: user.uid, postId: post.id, timestamp: serverTimestamp() });
            transaction.update(postRef, { upvotes: currentUpvotes + 1 });
        }
      });
    } catch(e) {
      console.error("Upvote transaction failed: ", e);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not process your upvote.'})
    }
  };

  const handleVolunteer = async () => {
    if (!user || !volunteerRef || !firestore) return;
    if (!location) {
      toast({
        variant: 'destructive',
        title: 'Location not found',
        description: 'We could not determine your location. Please enable location services.',
      });
      return;
    }
    
    const postRef = doc(firestore, 'posts', post.id);

    try {
        await runTransaction(firestore, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) {
                throw "Post does not exist!";
            }
            const data = postDoc.data();
            const currentVolunteers = data.volunteers || 0;
            const currentUpvotes = data.upvotes || 0;

            if (isVolunteered) {
                transaction.delete(volunteerRef);
                const newVolunteerCount = Math.max(0, currentVolunteers - 1);
                transaction.update(postRef, { 
                    volunteers: newVolunteerCount,
                    status: newVolunteerCount > 0 ? 'in_progress' : 'open',
                });
            } else {
                transaction.set(volunteerRef, { userId: user.uid, postId: post.id, latitude: location.latitude, longitude: location.longitude });
                transaction.update(postRef, { 
                    volunteers: currentVolunteers + 1,
                    status: 'in_progress',
                });
                
                // If user had upvoted, remove upvote since volunteering is a stronger engagement
                if (upvoteRef && (await transaction.get(upvoteRef)).exists()) {
                    transaction.delete(upvoteRef);
                    transaction.update(postRef, { upvotes: Math.max(0, currentUpvotes - 1) });
                }
                
                toast({
                    title: "Thank you for volunteering!",
                    description: "Your help makes the community better.",
                });
            }
        });
    } catch (e) {
        console.error("Volunteer transaction failed: ", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not process your request.'})
    }
  };

  const handleMarkAsResolved = async () => {
    if (!user || !firestore || !resolvedImageFile) return;

    setIsSubmittingResolution(true);

    // In a real app, you would upload the image to Firebase Storage and get the URL.
    // For this prototype, we'll use a random placeholder image.
    const randomImage = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];

    const postRef = doc(firestore, 'posts', post.id);
    const resolutionData = {
        status: 'resolved' as const,
        resolvedImageUrl: randomImage.imageUrl,
        resolvedBy: user.uid,
        resolvedTimestamp: serverTimestamp(),
    };

    updateDocumentNonBlocking(postRef, resolutionData);

    toast({
        title: 'Post Resolved!',
        description: 'Thank you for updating the community and uploading proof!',
    });
    
    setIsSubmittingResolution(false);
    setIsResolveDialogOpen(false);
    setResolvedImageFile(null);
    setResolvedImagePreview(null);
  }

  const urgencyClass = post.urgency === 'high' && post.status !== 'resolved' ? 'border-destructive border-2 animate-pulse-border' : '';
  const currentStatus = statusInfo[post.status || 'open'];
  const canMarkAsResolved = user && (isVolunteered || user.uid === post.authorId) && post.status === 'in_progress';

  return (
    <Card className={cn("flex flex-col overflow-hidden shadow-md transition-shadow hover:shadow-xl", urgencyClass, post.status === 'resolved' && 'bg-muted/30')}>
      <CardHeader className="flex flex-row items-center gap-4 p-4">
        <Avatar>
          <AvatarImage src={author?.avatarUrl} alt={author?.name} />
          <AvatarFallback>{author?.name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold">{author?.name || 'Anonymous'}</p>
          <p className="text-xs text-muted-foreground">
            {post.timestamp ? formatDistanceToNow(post.timestamp, { addSuffix: true }) : 'Just now'}
          </p>
        </div>
        <Badge variant="outline" className={cn("flex items-center gap-2", categoryColors[post.category])}>
            {categoryIcons[post.category]}
            {post.category}
        </Badge>
      </CardHeader>
      
      {post.status === 'resolved' && post.resolvedImageUrl ? (
          <div className="aspect-video w-full">
            <ReactCompareSlider
              itemOne={<ReactCompareSliderImage src={post.imageUrl} alt="Before" />}
              itemTwo={<ReactCompareSliderImage src={post.resolvedImageUrl} alt="After" />}
              className="w-full h-full"
            />
          </div>
      ) : (
        <div className="relative h-48 w-full">
            <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            />
        </div>
      )}


      <CardContent className="flex-1 p-4">
        <CardTitle className="mb-2 text-lg font-bold font-headline">{post.title}</CardTitle>
        <CardDescription>{post.description}</CardDescription>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 bg-muted/50 p-4">
        <div className="flex w-full items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
                <div className={cn("flex items-center gap-1.5", currentStatus.color)}>
                    {currentStatus.icon}
                    <span className="font-semibold">{currentStatus.text}</span>
                    {post.status === 'resolved' && resolver && (
                      <span className='ml-1 text-xs'>(by {resolver.name})</span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1.5">
                {isGlobalFeed ? (
                    <>
                        <Globe className="h-4 w-4 text-primary" />
                        <span>Global</span>
                    </>
                ) : (
                    <>
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{post.distance.toFixed(1)} km away</span>
                    </>
                )}
            </div>
        </div>

        {post.status !== 'resolved' && (
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant={isUpvoted ? "default" : "outline"} onClick={handleUpvote} disabled={!user || isVolunteered}>
              <ThumbsUp className="mr-2 h-4 w-4" />
              Upvote ({post.upvotes})
            </Button>
            <Button variant={isVolunteered ? "secondary" : "outline"} className={isVolunteered ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''} onClick={handleVolunteer} disabled={!user}>
              <HandHeart className="mr-2 h-4 w-4" />
              I can help ({post.volunteers})
            </Button>
          </div>
        )}

        {canMarkAsResolved && (
            <Button variant="default" className="w-full bg-green-500 text-white hover:bg-green-600" onClick={() => setIsResolveDialogOpen(true)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark as Resolved
            </Button>
        )}
      </CardFooter>
      
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Mark Issue as Resolved</DialogTitle>
                <DialogDescription>
                    Thank you for your help! Please upload a photo showing the resolved issue to close this post.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="picture">Resolution Picture</Label>
                    <div className="flex items-center gap-4">
                        <label className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground">
                            <Upload className="h-4 w-4" />
                            <span>{resolvedImageFile ? 'Change file' : 'Upload photo'}</span>
                            <Input id="picture" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                        </label>
                         {resolvedImageFile && (
                          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                            <FileCheck className="h-5 w-5 shrink-0 text-green-500" />
                            <span className="truncate">{resolvedImageFile.name}</span>
                          </div>
                        )}
                    </div>
                </div>
                {resolvedImagePreview && (
                    <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Image Preview:</p>
                        <Image src={resolvedImagePreview} alt="Preview of resolved issue" width={400} height={300} className="rounded-md object-cover"/>
                    </div>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleMarkAsResolved} disabled={!resolvedImageFile || isSubmittingResolution}>
                    {isSubmittingResolution && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Resolution
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
}
