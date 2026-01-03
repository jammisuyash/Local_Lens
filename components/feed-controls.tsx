'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SortType } from '@/lib/types';
import { ListFilter, Clock, ThumbsUp, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedControlsProps {
  sortType: SortType;
  onSortChange: (sortType: SortType) => void;
  isGlobalFeed?: boolean;
}

export default function FeedControls({ sortType, onSortChange, isGlobalFeed }: FeedControlsProps) {
  const currentSortType = isGlobalFeed && sortType === 'distance' ? 'priority' : sortType;
  return (
    <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
      <h1 className="text-2xl font-bold tracking-tight font-headline">{isGlobalFeed ? 'Global Feed' : 'Nearby Posts'}</h1>
      <Tabs value={currentSortType} onValueChange={(value) => onSortChange(value as SortType)}>
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
          <TabsTrigger value="priority" className="flex items-center gap-2">
            <ListFilter className="h-4 w-4" />
            Priority
          </TabsTrigger>
          <TabsTrigger value="latest" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Latest
          </TabsTrigger>
          <TabsTrigger value="upvotes" className="flex items-center gap-2">
            <ThumbsUp className="h-4 w-4" />
            Upvotes
          </TabsTrigger>
          <TabsTrigger value="distance" className={cn("flex items-center gap-2", isGlobalFeed && "cursor-not-allowed opacity-50")}>
            <MapPin className="h-4 w-4" />
            Distance
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
