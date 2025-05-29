
'use server';

/**
 * @fileOverview Generates French sentences suitable for young children,
 * along with identified subjects and verbs.
 *
 * - generateFrenchSentence - A function that generates a French sentence with grammatical analysis.
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
  sentence: z.string().describe('A simple French sentence suitable for young children (e.g., "Le chat mange.").'),
  words: z.array(z.string()).describe('The sentence tokenized into words (e.g., ["Le", "chat", "mange."]). Punctuation should be attached to the preceding word.'),
  verbIndices: z.array(z.number()).describe('The 0-based indices of the verb(s) in the `words` array (e.g., for "Le chat mange.", if words is ["Le", "chat", "mange."], verbIndices would be [2]). This should include all parts of a compound verb or verb phrase (e.g., "va manger", "aimons lire").'),
  subjectIndices: z.array(z.number()).describe('The 0-based indices of the subject(s) in the `words` array (e.g., for "Le chat mange.", if words is ["Le", "chat", "mange."], subjectIndices would be [0, 1]). If the subject is implied (e.g., imperative sentences), this can be an empty array.'),
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
  prompt: `You are an expert French linguist and teacher. Your task is to generate simple French sentences suitable for young children learning about verbs and subjects.

The sentences must:
1. Be grammatically correct and simple.
2. Contain a clear subject (explicit or implicit for imperatives) and at least one main verb. The verb can be a single word (e.g., 'mange') or a compound verb phrase (e.g., 'va manger', 'a joué'). For verb + infinitive constructions like 'aimons lire', include both the conjugated verb and the infinitive in the \`verbIndices\`.
3. Be appropriate for young children (around 5-8 years old).
4. Punctuation marks (like '.', '!', '?') should be attached to the preceding word in the 'words' array. For example, "joue." is one token, not "joue" and ".".

{{#if topic}}
The sentence should be related to the topic: {{{topic}}}.
{{/if}}

You need to provide the sentence, the sentence tokenized into words, and the 0-based indices for all subject words and all verb words within the tokenized \`words\` array.

Example 1:
Input: {}
Output:
{
  "sentence": "Le petit chien joue.",
  "words": ["Le", "petit", "chien", "joue."],
  "subjectIndices": [0, 1, 2],
  "verbIndices": [3]
}

Example 2 (Imperative, implicit subject "tu" or "vous"):
Input: {}
Output:
{
  "sentence": "Chante une chanson !",
  "words": ["Chante", "une", "chanson!"],
  "subjectIndices": [],
  "verbIndices": [0]
}

Example 3 (Compound verb):
Input: {}
Output:
{
  "sentence": "Elle va manger.",
  "words": ["Elle", "va", "manger."],
  "subjectIndices": [0],
  "verbIndices": [1, 2]
}

Example 4 (Simple sentence):
Input: { "topic": "cats" }
Output:
{
  "sentence": "Le chat dort.",
  "words": ["Le", "chat", "dort."],
  "subjectIndices": [0, 1],
  "verbIndices": [2]
}

Example 5 (Sentence with "n'est pas"):
Input: {}
Output:
{
  "sentence": "Ce n'est pas difficile.",
  "words": ["Ce", "n'", "est", "pas", "difficile."],
  "subjectIndices": [0],
  "verbIndices": [2] 
}

Example 6 (Verb + Infinitive):
Input: {}
Output:
{
  "sentence": "Nous aimons lire.",
  "words": ["Nous", "aimons", "lire."],
  "subjectIndices": [0],
  "verbIndices": [1, 2]
}

Ensure your response strictly adheres to the output schema.
Only provide the JSON object as specified by the schema.
`,
});

const generateFrenchSentenceFlow = ai.defineFlow(
  {
    name: 'generateFrenchSentenceFlow',
    inputSchema: GenerateFrenchSentenceInputSchema,
    outputSchema: GenerateFrenchSentenceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      // Fallback or error handling if AI fails to provide output
      console.error("AI did not return output for generateFrenchSentenceFlow. Input:", input);
      return {
        sentence: "Le soleil brille.",
        words: ["Le", "soleil", "brille."],
        subjectIndices: [0, 1],
        verbIndices: [2],
      };
    }
    return output;
  }
);

