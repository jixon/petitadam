
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
  words: z.array(z.string()).describe('The sentence tokenized into words (e.g., ["Le", "chat", "mange."]). Punctuation should be attached to the preceding word. Contractions like "n\'est" should be tokenized as ["n\'", "est"].'),
  verbIndices: z.array(z.number()).describe('The 0-based indices of the verb(s) in the `words` array (e.g., for "Le chat mange.", if words is ["Le", "chat", "mange."], verbIndices would be [2]). This should include all parts of a compound verb or verb phrase (e.g., "va manger", "aimons lire").'),
  subjectIndices: z.array(z.number()).describe('The 0-based indices of the subject(s) in the `words` array (e.g., for "Le chat mange.", if words is ["Le", "chat", "mange."], subjectIndices would be [0, 1]). If the subject is implied (e.g., imperative sentences like "Regarde!"), this MUST be an empty array.'),
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
2. Contain a clear subject and at least one main verb. The verb can be a single word (e.g., 'mange') or a compound verb phrase (e.g., 'va manger', 'a joué'). For verb + infinitive constructions like 'aimons lire', include both the conjugated verb and the infinitive in the \`verbIndices\`.
3. For imperative sentences (commands) where the subject is implied and not explicitly written (e.g., 'Regarde le soleil !' or 'Mange !'), the \`subjectIndices\` array MUST be empty.
4. Be appropriate for young children (around 5-8 years old).
5. Punctuation marks (like '.', '!', '?') should be attached to the preceding word in the 'words' array. For example, "joue." is one token, not "joue" and ".".
6. Contractions: For contractions like "n'est pas" or "l'ami", tokenize them carefully. For example, "n'est pas" should become ["n'", "est", "pas"]. "l'ami" should become ["l'", "ami"].

**Tonic Pronouns and Subjects:**
Be very careful with tonic pronouns (Moi, Toi, Lui, Elle, Nous, Vous, Eux, Elles).
- If a tonic pronoun is used for emphasis alongside a standard subject pronoun (e.g., 'Moi, je mange', 'Toi, tu chantes'), the \`subjectIndices\` should ONLY include the standard subject pronoun (e.g., 'je', 'tu'). The tonic pronoun is for emphasis, not the grammatical subject itself in these cases.
- If a tonic pronoun is used ALONE as the subject (e.g., in response to a question like 'Qui veut jouer ? Moi !'), then it IS the subject and should be in \`subjectIndices\`.

{{#if topic}}
The sentence should be related to the topic: {{{topic}}}.
{{else}}
Please generate a simple and **new/different** French sentence suitable for young children. Actively try to make it distinct from sentences you may have generated previously.
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

Example 2 (Imperative, implicit subject, correct handling):
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

Example 7 (Tonic pronoun for emphasis with subject pronoun):
Input: {}
Output:
{
  "sentence": "Moi, je regarde la télé.",
  "words": ["Moi,", "je", "regarde", "la", "télé."],
  "subjectIndices": [1],
  "verbIndices": [2]
}

Example 8 (Tonic pronoun used alone as subject):
Input: {}
Output:
{
  "sentence": "Qui a dit ça ? Eux.",
  "words": ["Qui", "a", "dit", "ça?", "Eux."],
  "subjectIndices": [4],
  "verbIndices": [1,2]
}

Example 9 (Imperative with direct object, implicit subject):
Input: {}
Output:
{
  "sentence": "Regarde le ciel bleu.",
  "words": ["Regarde", "le", "ciel", "bleu."],
  "subjectIndices": [],
  "verbIndices": [0]
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
      // Return a varied fallback to make it obvious if this is hit repeatedly
      const fallbacks = [
        { sentence: "Le soleil brille.", words: ["Le", "soleil", "brille."], subjectIndices: [0, 1], verbIndices: [2] },
        { sentence: "Le chat joue.", words: ["Le", "chat", "joue."], subjectIndices: [0, 1], verbIndices: [2] },
        { sentence: "L'oiseau chante.", words: ["L'", "oiseau", "chante."], subjectIndices: [0,1], verbIndices: [2] },
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    // Validate that subjectIndices is an array, even if empty
    if (!Array.isArray(output.subjectIndices)) {
        console.warn("AI output.subjectIndices is not an array, defaulting to empty. Output:", output);
        output.subjectIndices = [];
    }
    // Validate that verbIndices is an array
     if (!Array.isArray(output.verbIndices) || output.verbIndices.length === 0) {
        console.warn("AI output.verbIndices is not a non-empty array, using fallback. Output:", output);
         // This case should ideally be rare with a good prompt, but as a last resort:
        return { sentence: "La fleur pousse.", words: ["La", "fleur", "pousse."], subjectIndices: [0, 1], verbIndices: [2] };
    }
    return output;
  }
);
