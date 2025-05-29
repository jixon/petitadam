
'use server';

/**
 * @fileOverview Generates French sentences suitable for young children,
 * along with identified subjects and verbs. The sentences will feature a single-word main verb.
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
  sentence: z.string().describe('A simple French sentence suitable for young children (e.g., "Le chat mange."). The sentence should be new and different from previous ones if possible, and feature a single-word main verb.'),
  words: z.array(z.string()).describe('The sentence tokenized into words (e.g., ["Le", "chat", "mange."]). Punctuation should be attached to the preceding word. Contractions like "n\'est" should be tokenized as ["n\'", "est"].'),
  verbIndices: z.array(z.number()).describe('The 0-based indices of the single-word main verb in the `words` array (e.g., for "Le chat mange.", if words is ["Le", "chat", "mange."], verbIndices would be [2]). This should only contain one index for the main verb.'),
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
  prompt: `You are an expert French linguist and teacher. Your task is to generate simple French sentences suitable for young children learning about verbs and subjects. The game will focus on identifying a single-word verb.

The sentences must:
1. Be grammatically correct and **very simple**, suitable for young children (around 5-8 years old).
2. Contain a clear subject (unless an imperative sentence) and **one main verb that is a single word** (e.g., "mange", "court", "saute").
   - **IMPORTANT**: Avoid compound verbs (e.g., "a mangé", "va jouer") and constructions where the verb to be identified by the child would span multiple words (e.g., "aime dessiner"). The game focuses on identifying a single-word action verb.
3. For imperative sentences (commands) where the subject is implied (e.g., 'Regarde !', 'Chante !'), the \`subjectIndices\` array MUST be empty.
4. Punctuation marks (like '.', '!', '?') should be attached to the preceding word in the 'words' array. For example, "joue." is one token, not "joue" and ".".
5. Contractions: For contractions like "n'est pas" or "l'ami", tokenize them carefully. For example, "n'est pas" should become ["n'", "est", "pas"]. "l'ami" should become ["l'", "ami"]. "Ce n'est pas" has "est" as the verb.

**Tonic Pronouns and Subjects:**
Be very careful with tonic pronouns (Moi, Toi, Lui, Elle, Nous, Vous, Eux, Elles).
- If a tonic pronoun is used for emphasis alongside a standard subject pronoun (e.g., 'Moi, je mange', 'Toi, tu chantes'), the \`subjectIndices\` should ONLY include the standard subject pronoun (e.g., 'je', 'tu'). The tonic pronoun is for emphasis, not the grammatical subject itself in these cases.
- If a tonic pronoun is used ALONE as the subject (e.g., in response to a question like 'Qui veut jouer ? Moi !'), then it IS the subject and should be in \`subjectIndices\`.

{{#if topic}}
The sentence should be related to the topic: {{{topic}}}. Ensure the main verb is a single word and the sentence is new/unique if possible.
{{else}}
Please generate a **new and unique** simple French sentence with a **single-word main verb**. Actively try to make it distinct from any sentences you may have generated previously. Avoid common or overly simple phrases if possible, introduce variety while keeping it easy for young children.
{{/if}}

You need to provide the sentence, the sentence tokenized into words, and the 0-based indices for all subject words and the single main verb word within the tokenized \`words\` array.

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

Example 3 (Simple verb with object):
Input: {}
Output:
{
  "sentence": "Le garçon dessine un arbre.",
  "words": ["Le", "garçon", "dessine", "un", "arbre."],
  "subjectIndices": [0, 1],
  "verbIndices": [2]
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

Example 5 (Sentence with "n'est pas", verb is "est"):
Input: {}
Output:
{
  "sentence": "Ce n'est pas difficile.",
  "words": ["Ce", "n'", "est", "pas", "difficile."],
  "subjectIndices": [0], 
  "verbIndices": [2] 
}

Example 6 (Simple verb with different subject):
Input: {}
Output:
{
  "sentence": "Les oiseaux volent.",
  "words": ["Les", "oiseaux", "volent."],
  "subjectIndices": [0, 1],
  "verbIndices": [2]
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

Example 8 (Tonic pronoun used alone as subject, simple verb):
Input: {}
Output:
{
  "sentence": "Qui parle ? Lui.",
  "words": ["Qui", "parle?", "Lui."],
  "subjectIndices": [2],
  "verbIndices": [1]
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

Example 10 (Simple verb, direct object):
Input: {}
Output:
{
  "sentence": "Nous voulons un gâteau.",
  "words": ["Nous", "voulons", "un", "gâteau."],
  "subjectIndices": [0],
  "verbIndices": [1]
}


Ensure your response strictly adheres to the output schema.
Only provide the JSON object as specified by the schema.
The verbIndices array should contain exactly one index for the single-word main verb.
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
      console.error("AI did not return output for generateFrenchSentenceFlow. Input:", input);
      const fallbacks = [
        { sentence: "Le chien court vite.", words: ["Le", "chien", "court", "vite."], subjectIndices: [0, 1], verbIndices: [2] },
        { sentence: "Le chaton miaule.", words: ["Le", "chaton", "miaule."], subjectIndices: [0, 1], verbIndices: [2] },
        { sentence: "L'oiseau bleu chante.", words: ["L'", "oiseau", "bleu", "chante."], subjectIndices: [0,1,2], verbIndices: [3] },
        { sentence: "Elle dessine une fleur.", words: ["Elle", "dessine", "une", "fleur."], subjectIndices: [0], verbIndices: [1]},
        { sentence: "Tu manges une fraise.", words: ["Tu", "manges", "une", "fraise."], subjectIndices: [0], verbIndices: [1]},
        { sentence: "Les enfants jouent dehors.", words: ["Les", "enfants", "jouent", "dehors."], subjectIndices: [0,1], verbIndices: [2]},
        { sentence: "Mon ami lit un livre.", words: ["Mon", "ami", "lit", "un", "livre."], subjectIndices: [0,1], verbIndices: [2]},
        { sentence: "Le bébé sourit.", words: ["Le", "bébé", "sourit."], subjectIndices: [0,1], verbIndices: [2]},
        { sentence: "Papa travaille ici.", words: ["Papa", "travaille", "ici."], subjectIndices: [0], verbIndices: [1]},
        { sentence: "Maman cuisine bien.", words: ["Maman", "cuisine", "bien."], subjectIndices: [0], verbIndices: [1]},
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    
    if (!Array.isArray(output.subjectIndices)) {
        console.warn("AI output.subjectIndices is not an array, defaulting to empty. Output:", output);
        output.subjectIndices = [];
    }
    
    if (!Array.isArray(output.verbIndices) || output.verbIndices.length !== 1) {
        console.warn("AI output.verbIndices is not a single-element array, using fallback. Output:", output);
        // Provide a very basic fallback if verbIndices are missing or incorrect, ensuring it's valid
        return { sentence: "La fleur pousse.", words: ["La", "fleur", "pousse."], subjectIndices: [0, 1], verbIndices: [2] };
    }
    return output;
  }
);

