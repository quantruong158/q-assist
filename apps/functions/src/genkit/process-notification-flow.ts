import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({
  plugins: [googleAI()],
});

export const NotificationParsedResult = z.object({
  type: z.enum(['income', 'expense', 'non_transaction']),
  amount: z.number(),
  currency: z.string().default('VND'),
  merchant: z.string(),
  timestamp: z.string().datetime(),
});

export const processNotificationFlow = ai.defineFlow(
  {
    name: 'processNotificationFlow',
    inputSchema: z.string(),
    outputSchema: NotificationParsedResult,
  },
  async (smsText) => {
    const { output } = await ai.generate({
      model: googleAI.model('gemma-3-27b-it'),
      prompt: `Act as a precise data extraction engine. Your task is to parse a mobile notification into a specific JSON schema.
### SCHEMA:
- type: "income" (positive raw amount), "expense" (negative raw amount), or "non_transaction" (OTPs, ads, alerts).
- amount: Number. Always positive. 0 if non_transaction.
- currency: 3-letter ISO code. Default is "VND".
- merchant: The name of the platform, bank, or person (e.g., Momo, ZaloPay, ShopeePay).
- timestamp: ISO 8601 string in the format: YYYY-MM-DDTHH:mm:ssZ (e.g., 2026-03-07T14:30:00Z).
### CONSTRAINTS:
1. Return ONLY the raw JSON string.
2. Do NOT include Markdown code blocks (e.g., no \`\`\`json).
3. Do NOT include any introductory or concluding text.
4. Ensure the output is valid JSON and can be parsed by JSON.parse() immediately.
5. The timestamp MUST be a valid ISO 8601 string in the format: YYYY-MM-DDTHH:mm:ssZ (e.g., 2026-03-07T14:30:00Z).
### NOTIFICATION CONTENT:
"${smsText}"`,
    });

    if (!output) throw new Error('Could not parse transaction.');
    return output;
  },
);
