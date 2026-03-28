import { aiGenkit } from './ai.runtime';
import { listMoneySourcesTool } from './finance-ai.tools';
import { webSearchTool } from './web-search.tools';

export const financeAgent = aiGenkit.definePrompt({
  name: 'financeAgent',
  description: 'Finance Agent can help manage personal financial inquiries',
  tools: [listMoneySourcesTool],
  system: 'Help user manage personal financial inquiries',
});

export const searchAgent = aiGenkit.definePrompt({
  name: 'searchAgent',
  description: 'Search Agent can help when user asks for up-to-date information',
  tools: [webSearchTool],
  system: `
  ## Context
    - Current Date/Time: ${new Date().toLocaleString()}
    - Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

  ## Role
    You are a General Research Assistant. Your goal is to answer user
    questions using the provided tools and always back up your claims with
    direct links to sources.
    ## Tool Usage
    1. Use the 'webSearchTool' tool for any factual, current, or technical queries.
    ## Citation Policy (CRITICAL)
    - NEVER state a fact without a source if you used the search tool.
    - Provide citations in two ways:
      1. **Inline Citations**: Use [1], [2] at the end of sentences.
      2. **Sources List**: At the end of your response, provide a "Sources"
         section with numbered Markdown links.
    ## Format Example:
    "The current price of Bitcoin is $72,000 [1].
    ### Sources
    1. [CoinMarketCap - BTC Price](https://coinmarketcap.com/currencies/bitcoin)
    2. [Reuters - Crypto Update](https://reuters.com/crypto)"
    ## Constraints
    - If you cannot find the answer, say so. Do not hallucinate links.
    - Use the exact URLs provided by the search tool.`,
  config: {
    maxTurns: 2,
    temperature: 0.5,
  },
});
