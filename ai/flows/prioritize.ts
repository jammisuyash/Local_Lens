import type { PostWithDistance } from '@/lib/types';

/**
 * An AI tool that helps prioritize the display of urgent posts to make sure help comes to the people that need it faster.
 * @param posts An array of posts to be prioritized.
 * @returns A new array of posts, sorted by priority.
 */
export function prioritizePosts(posts: PostWithDistance[]): PostWithDistance[] {
  // Create a copy to avoid mutating the original array
  const postsCopy = [...posts];

  const getPriorityScore = (post: PostWithDistance): number => {
    let score = 0;

    // Urgency from AI model
    if (post.urgency === 'high') {
      score += 500;
    } else if (post.urgency === 'medium') {
      score += 200;
    }

    // Time-based decay: newer posts are more relevant
    const hoursOld = (new Date().getTime() - post.timestamp.getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 100 - hoursOld * 2); // Score decreases faster over time

    // Upvote-based social proof
    score += post.upvotes * 1.5;

    // Volunteer activity indicates community engagement and issue resolution
    score += post.volunteers * 10;
    
    // Proximity bonus: closer issues are more relevant
    if (post.distance < 1) { // within 1km
        score += 50;
    } else {
        score += Math.max(0, 30 - post.distance * 3);
    }

    return score;
  };

  postsCopy.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

  return postsCopy;
}
