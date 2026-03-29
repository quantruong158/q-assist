import { tavilySearch } from '@tavily/ai-sdk';

export const webSearchTool = tavilySearch({
  apiKey: process.env['TAVILY_API_KEY'],
  searchDepth: 'basic',
  includeAnswer: true,
  includeImages: false,
  maxResults: 5,
});
