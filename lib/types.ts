import { Timestamp } from "firebase/firestore";

export type Category =
  | 'Garbage'
  | 'Potholes'
  | 'Water Issue'
  | 'Lost & Found'
  | 'Event'
  | 'News'
  | 'Other';

export type UrgencyLevel = 'low' | 'medium' | 'high';
export type PostStatus = 'open' | 'in_progress' | 'resolved';

export interface Post {
  id: string;
  authorId: string;
  category: Category;
  title: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  lat: number;
  lng: number;
  upvotes: number;
  volunteers: number;
  timestamp: Timestamp | Date; // Allow both for client-side creation and Firestore data
  urgency?: UrgencyLevel;
  status: PostStatus;
  resolvedImageUrl?: string;
  resolvedBy?: string;
  resolvedTimestamp?: Timestamp | Date;
}

export interface PostWithDistance extends Post {
  distance: number;
  timestamp: Date; // Ensure timestamp is a Date object for client-side sorting
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  latitude?: number;
  longitude?: number;
  isVolunteer?: boolean;
  teamId?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  latitude: number;
  longitude: number;
  memberIds: string[];
}


export type SortType = 'priority' | 'latest' | 'upvotes' | 'distance';
