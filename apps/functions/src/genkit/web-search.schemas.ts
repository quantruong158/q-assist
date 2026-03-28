import { z } from 'genkit';

export const webSearchInputSchema = z.object({
  query: z.string().describe('The search query to look up on the web'),
});

export const webSearchOutputSchema = z.object({
  query: z.string().describe('The original search query'),
  answer: z.string().optional().describe('AI-generated answer to the query'),
  results: z.array(
    z.object({
      title: z.string().describe('Title of the search result'),
      url: z.string().describe('URL of the search result'),
      content: z.string().describe('Snippet of the content from the search result'),
      score: z.number().describe('Relevance score of the result'),
      publishedDate: z.string().optional().describe('Publication date of the content'),
    }),
  ),
  responseTime: z.number().describe('Time taken for the API request in milliseconds'),
});
