import type { Post, User } from './types';
import { PlaceHolderImages } from './placeholder-images';
import { Timestamp } from 'firebase/firestore';

export const mockUsers: User[] = [
  { id: 'user1', name: 'Alice Johnson', avatarUrl: 'https://i.pravatar.cc/150?u=user1' },
  { id: 'user2', name: 'Bob Williams', avatarUrl: 'https://i.pravatar.cc/150?u=user2' },
  { id: 'user3', name: 'Charlie Brown', avatarUrl: 'https://i.pravatar.cc/150?u=user3' },
];

const centralLat = 34.0522;
const centralLng = -118.2437;
const radius = 0.05; // Approx 5.5 km

const getRandomCoords = () => ({
  lat: centralLat + (Math.random() - 0.5) * radius * 2,
  lng: centralLng + (Math.random() - 0.5) * radius * 2,
});

const getImage = (id: string) => {
    const img = PlaceHolderImages.find(p => p.id === id);
    if (!img) {
        // Fallback for safety, though it shouldn't be needed with proper data setup.
        return { imageUrl: 'https://picsum.photos/seed/fallback/600/400', imageHint: 'placeholder image' };
    }
    return { imageUrl: img.imageUrl, imageHint: img.imageHint };
}

export const mockPosts: Omit<Post, 'id'>[] = [
  {
    userId: 'user1',
    category: 'Garbage',
    title: 'Overflowing Bins at Echo Park',
    description: 'The garbage cans near the lake have been overflowing for days. It\'s starting to smell really bad and attract pests.',
    ...getImage('post1'),
    ...getRandomCoords(),
    upvotes: 128,
    volunteers: 3,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 2)), // 2 hours ago
    urgency: 'high',
  },
  {
    userId: 'user2',
    category: 'Potholes',
    title: 'Major Pothole on Sunset Blvd',
    description: 'There\'s a huge pothole on Sunset Blvd near the intersection with Silver Lake Blvd. It\'s a danger to cars and cyclists.',
    ...getImage('post2'),
    ...getRandomCoords(),
    upvotes: 256,
    volunteers: 0,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24)), // 1 day ago
    urgency: 'high',
  },
  {
    userId: 'user3',
    category: 'Water Issue',
    title: 'Leaking Fire Hydrant',
    description: 'A fire hydrant on my street has been leaking water for the past week. It\'s a huge waste of water.',
    ...getImage('post3'),
    ...getRandomCoords(),
    upvotes: 78,
    volunteers: 1,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 8)), // 8 hours ago
    urgency: 'high',
  },
  {
    userId: 'user1',
    category: 'Lost & Found',
    title: 'Lost Dog in Griffith Park',
    description: 'Found a small, friendly terrier mix near the observatory. No collar. Currently safe with me. Please contact if you are the owner.',
    ...getImage('post4'),
    ...getRandomCoords(),
    upvotes: 312,
    volunteers: 15,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 30)), // 30 minutes ago
    urgency: 'medium',
  },
  {
    userId: 'user2',
    category: 'Event',
    title: 'Community Cleanup Day',
    description: 'Join us this Saturday at 10 AM for a community cleanup event at MacArthur Park. Gloves and bags will be provided.',
    ...getImage('post5'),
    ...getRandomCoords(),
    upvotes: 45,
    volunteers: 22,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)), // 3 days ago
    urgency: 'low',
  },
  {
    userId: 'user3',
    category: 'News',
    title: 'New Bike Lanes on 7th Street',
    description: 'The city has just finished installing new protected bike lanes on 7th Street downtown. Let\'s support this great initiative!',
    ...getImage('post6'),
    ...getRandomCoords(),
    upvotes: 92,
    volunteers: 0,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 48)), // 2 days ago
    urgency: 'low',
  },
  {
    userId: 'user1',
    category: 'Other',
    title: 'Fallen Tree Blocking Road',
    description: 'A large tree has fallen and is blocking the road on a residential street. Cars cannot pass.',
    ...getImage('post7'),
    ...getRandomCoords(),
    upvotes: 189,
    volunteers: 2,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 1)), // 1 hour ago
    urgency: 'high',
  },
  {
    userId: 'user2',
    category: 'Other',
    title: 'Broken Streetlight',
    description: 'The streetlight at the corner of my block has been out for over a month. It makes the area feel unsafe at night.',
    ...getImage('post8'),
    ...getRandomCoords(),
    upvotes: 64,
    volunteers: 0,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)), // 5 days ago
    urgency: 'medium',
  },
];
