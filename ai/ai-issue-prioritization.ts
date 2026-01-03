'use server';

/**
 * @fileOverview Implements an AI-powered issue prioritization flow.
 *
 * This flow analyzes user posts to determine their urgency level, helping to ensure that critical issues receive prompt attention.
 *
 * - prioritizeIssue - A function to prioritize an issue.
 * - PrioritizeIssueInput - The input type for the prioritizeIssue function, including post details.
 * - PrioritizeIssueOutput - The return type for the prioritizeIssue function, indicating the urgency level.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PrioritizeIssueInputSchema = z.object({
  category: z.string().describe('Category of the post (e.g., garbage, potholes, water issues).'),
  title: z.string().describe('Title of the post.'),
  description: z.string().describe('Detailed description of the issue.'),
});
export type PrioritizeIssueInput = z.infer<typeof PrioritizeIssueInputSchema>;

const PrioritizeIssueOutputSchema = z.object({
  urgencyLevel: z
    .enum(['low', 'medium', 'high'])
    .describe('The urgency level of the issue, with high indicating immediate attention is needed.'),
  reason: z
    .string()
    .describe('The reasoning behind the assigned urgency level, providing context for the prioritization.'),
});
export type PrioritizeIssueOutput = z.infer<typeof PrioritizeIssueOutputSchema>;

export async function prioritizeIssue(input: PrioritizeIssueInput): Promise<PrioritizeIssueOutput> {
  return prioritizeIssueFlow(input);
}

const prompt = ai.definePrompt({
  name: 'prioritizeIssuePrompt',
  input: {schema: PrioritizeIssueInputSchema},
  output: {schema: PrioritizeIssueOutputSchema},
  prompt: `You are an AI assistant designed to evaluate the urgency of community issues.

  Analyze the following issue post to determine its urgency level (low, medium, or high).
  Provide a brief explanation for your assessment. Focus on the impact on the community and potential risks if the issue is not addressed promptly.

  Category: {{{category}}}
  Title: {{{title}}}
  Description: {{{description}}}

  Respond with a JSON object with urgencyLevel and reason fields.`,
});

const prioritizeIssueFlow = ai.defineFlow(
  {
    name: 'prioritizeIssueFlow',
    inputSchema: PrioritizeIssueInputSchema,
    outputSchema: PrioritizeIssueOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
