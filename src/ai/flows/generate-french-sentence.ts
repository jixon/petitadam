'use server';

/**
 * @fileOverview Generates French sentences suitable for young children.
 *
 * - generateFrenchSentence - A function that generates a French sentence.
 * - GenerateFrenchSentenceInput - The input type for the generateFrenchSentence function.
 * - GenerateFrenchSentenceOutput - The return type for the generateFrenchSentence function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFrenchSentenceInputSchema = z.object({
  topic: z.string().optional().describe('An optional topic to generate the sentence about.'),
});
export type GenerateFrenchSentenceInput = z.infer<typeof GenerateFrenchSentenceInputSchema>;

const GenerateFrenchSentenceOutputSchema = z.object({
  sentence: z.string().describe('A simple French sentence suitable for young children.'),
});
export type GenerateFrenchSentenceOutput = z.infer<typeof GenerateFrenchSentenceOutputSchema>;

export async function generateFrenchSentence(
  input: GenerateFrenchSentenceInput
): Promise<GenerateFrenchSentenceOutput> {
  return generateFrenchSentenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFrenchSentencePrompt',
  input: {schema: GenerateFrenchSentenceInputSchema},
  output: {schema: GenerateFrenchSentenceOutputSchema},
  prompt: `You are a helpful AI assistant specialized in generating simple French sentences for young children. The sentences should contain a clear subject and verb.

{% if topic %}The sentence should be about the topic: {{{topic}}}.{% endif %}

Respond with ONLY the sentence.  Do not include any additional explanation or context.  The response must be a single sentence.

Sentence:`,
});

const generateFrenchSentenceFlow = ai.defineFlow(
  {
    name: 'generateFrenchSentenceFlow',
    inputSchema: GenerateFrenchSentenceInputSchema,
    outputSchema: GenerateFrenchSentenceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
