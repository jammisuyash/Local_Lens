'use client';

import type { ReactElement } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, MapPinOff } from 'lucide-react';
import Link from 'next/link';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';

import PostCard from '@/components/post-card';
import FeedControls from '@/components/feed-controls';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { useLocation } from '@/hooks/use-location';
import { useCollection, useFirestore } from '@/firebase';
import type { Post, PostWithDistance, SortType } from '@/lib/types';
import { calculateDistance } from '@/lib/utils';
import { prioritizePosts } from '@/ai/flows/prioritize';

const POST_RADIUS_KM = 10;
const GLOBAL_FEED_POST_LIMIT = 50;

export default function Home(): ReactElement {
  const { location, error: locationError, getLocation } = useLocation();
  const firestore = useFirestore();

  const [sortType, setSortType] = useState<SortType>('priority');
  const [feedType, setFeedType] = useState<'nearby' | 'global'>('global');
  const [finalPosts, setFinalPosts] = useState<PostWithDistance[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);

  // 🔹 Firestore query
  const postsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'posts'),
      orderBy('timestamp', 'desc'),
      limit(GLOBAL_FEED_POST_LIMIT)
    );
  }, [firestore]);

  // 🔹 Raw data fetching from Firestore
  const {
    data: allPosts,
    isLoading: isLoadingPosts,
    error: postsError,
  } = useCollection<Post>(postsQuery);

  // 🔹 Effect to process and sort data when dependencies change
  useEffect(() => {
    if (isLoadingPosts) {
      setIsProcessing(true);
      return;
    }
    
    if (!allPosts) {
        setFinalPosts([]);
        setIsProcessing(false);
        return;
    }

    let cancelled = false;
    setIsProcessing(true);

    // Determine feed type based on location
    const currentFeedType = location ? 'nearby' : 'global';
    setFeedType(currentFeedType);

    // 1. Normalize and filter posts
    const postsWithDistance = allPosts
      .map((post) => {
        const timestamp =
          post.timestamp instanceof Timestamp
            ? post.timestamp.toDate()
            : new Date(post.timestamp);

        const distance =
          location && post.lat != null && post.lng != null
            ? calculateDistance(
                location.latitude,
                location.longitude,
                post.lat,
                post.lng
              )
            : Infinity;

        return { ...post, timestamp, distance };
      })
      .filter((post) =>
        currentFeedType === 'global' ? true : post.distance <= POST_RADIUS_KM
      );

    // 2. Sort posts
    async function sortPosts() {
      let sorted = [...postsWithDistance];
      const effectiveSort =
        currentFeedType === 'global' && sortType === 'distance'
          ? 'priority'
          : sortType;

      switch (effectiveSort) {
        case 'latest':
          sorted.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          break;
        case 'upvotes':
          sorted.sort((a, b) => b.upvotes - a.upvotes);
          break;
        case 'distance':
          sorted.sort((a, b) => a.distance - b.distance);
          break;
        case 'priority':
        default:
           // The prioritizePosts function can be sync or async, handled correctly.
          sorted = await Promise.resolve(prioritizePosts(sorted));
          break;
      }

      if (!cancelled) {
        setFinalPosts(sorted);
        setIsProcessing(false);
      }
    }

    sortPosts();

    return () => {
      cancelled = true;
    };
  }, [allPosts, location, sortType, isLoadingPosts]);
  
  // 🔹 Loading skeleton
  if (isLoadingPosts || isProcessing) {
    return (
      <div className="container mx-auto max-w-lg p-4">
        <div className="my-6 flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4">
              <Skeleton className="h-48 w-full rounded-md" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg p-4">
      {locationError && (
        <Alert variant="default" className="mb-6 bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Showing Global Feed</AlertTitle>
           <AlertDescription>
             Could not get your location. Please enable location services to see nearby posts.
             <Button variant="secondary" size="sm" onClick={getLocation} className="mt-2 ml-auto block">
               Retry
             </Button>
           </AlertDescription>
        </Alert>
      )}

      <FeedControls
        sortType={sortType}
        onSortChange={setSortType}
        isGlobalFeed={feedType === 'global'}
      />

      {postsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading posts</AlertTitle>
          <AlertDescription>
            Something went wrong. Please try again later.
          </AlertDescription>
        </Alert>
      )}

      {finalPosts.length > 0 ? (
        <div className="grid gap-6">
          {finalPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isGlobalFeed={feedType === 'global'}
            />
          ))}
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-border bg-card p-12 text-center">
            <MapPinOff className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Nothing to see here... yet!</h2>
            <p className="max-w-md text-muted-foreground">
              {feedType === 'nearby'
                ? `There are no posts within a ${POST_RADIUS_KM}km radius. Be the first to post in your area!`
                : 'No posts have been created yet. Start the conversation!'}
            </p>
            <Button asChild>
              <Link href="/create-post">Be the First to Post</Link>
            </Button>
        </div>
      )}
    </div>
  );
}
