import { aiGenkit } from './ai.runtime';
import { tavily } from '@tavily/core';
import { webSearchInputSchema, webSearchOutputSchema } from './web-search.schemas';

export const webSearchTool = aiGenkit.defineTool(
  {
    name: 'webSearch',
    description: 'Search the web when user asks for the latest information or current events',
    inputSchema: webSearchInputSchema,
    outputSchema: webSearchOutputSchema,
  },
  async ({ query }) => {
    const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

    const response = await tavilyClient.search(query, {
      searchDepth: 'basic',
      maxResults: 5,
      includeAnswer: true,
      includeImages: false,
    });

    return {
      query: response.query,
      answer: response.answer,
      results: response.results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score,
        publishedDate: result.publishedDate,
      })),
      responseTime: response.responseTime,
    };
  },
);
