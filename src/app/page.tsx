
// @/app/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { generateFrenchSentence } from '@/ai/flows/generate-french-sentence';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WordChip } from '@/components/game/WordChip';
import { FireworksAnimation } from '@/components/animations/FireworksAnimation';
import { Progress } from "@/components/ui/progress";
import { Star, Brain, MessageCircleQuestion, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type GameStatus = 
  | 'loading' 
  | 'asking_verb' 
  | 'asking_subject' 
  | 'feedback_correct' 
  | 'feedback_incorrect_verb' 
  | 'feedback_incorrect_subject';

export default function VerbeHeroPage() {
  const [sentence, setSentence] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [correctVerbIndices, setCorrectVerbIndices] = useState<number[]>([]);
  const [correctSubjectIndices, setCorrectSubjectIndices] = useState<number[]>([]);
  
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>('loading');
  const [showFireworks, setShowFireworks] = useState(false);
  const [progressValue, setProgressValue] = useState(0);

  const fetchNewSentence = useCallback(async () => {
    setStatus('loading');
    setSelectedIndices([]);
    try {
      const result = await generateFrenchSentence({});
      setSentence(result.sentence);
      setWords(result.words);
      setCorrectSubjectIndices(result.subjectIndices);
      setCorrectVerbIndices(result.verbIndices);
      setStatus('asking_verb');
    } catch (error) {
      console.error("Failed to generate sentence:", error);
      // Fallback matches the one in the Genkit flow for consistency
      setSentence("Le soleil brille.");
      setWords(["Le", "soleil", "brille."]);
      setCorrectSubjectIndices([0, 1]);
      setCorrectVerbIndices([2]);
      setStatus('asking_verb');
    }
  }, []);

  useEffect(() => {
    fetchNewSentence();
  }, [fetchNewSentence]);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (status === 'loading') {
      setProgressValue(0); // Reset progress
      let currentProgress = 0;
      timer = setInterval(() => {
        currentProgress += 20; // Increment progress
        if (currentProgress >= 100) {
          setProgressValue(100);
          clearInterval(timer);
        } else {
          setProgressValue(currentProgress);
        }
      }, 150); // Adjust interval for speed (e.g. 150ms for faster loading feel)
    } else {
      // Optional: Reset progress if loading finishes very quickly or for other statuses
      // setProgressValue(0); 
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status]);

  const handleWordClick = (index: number) => {
    if (status !== 'asking_verb' && status !== 'asking_subject') return;

    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a,b) => a-b)
    );
  };

  const checkAnswer = (indicesToCheck: number[]): boolean => {
    if (selectedIndices.length !== indicesToCheck.length) return false;
    const sortedSelected = [...selectedIndices].sort((a, b) => a - b);
    const sortedCorrect = [...indicesToCheck].sort((a, b) => a - b);
    return sortedSelected.every((val, index) => val === sortedCorrect[index]);
  };

  const handleSubmit = () => {
    let isCorrect = false;
    if (status === 'asking_verb') {
      isCorrect = checkAnswer(correctVerbIndices);
      if (isCorrect) {
        setStatus('feedback_correct');
        setShowFireworks(true);
        setTimeout(() => {
          setShowFireworks(false);
          setSelectedIndices([]);
          setStatus('asking_subject');
        }, 2500);
      } else {
        setStatus('feedback_incorrect_verb');
        setTimeout(() => {
          setStatus('asking_verb'); 
        }, 1500);
      }
    } else if (status === 'asking_subject') {
      isCorrect = checkAnswer(correctSubjectIndices);
      if (isCorrect) {
        setStatus('feedback_correct');
        setShowFireworks(true);
        setScore(s => s + 10);
        setTimeout(() => {
          setShowFireworks(false);
          fetchNewSentence(); 
        }, 2500);
      } else {
        setStatus('feedback_incorrect_subject');
         setTimeout(() => {
          setStatus('asking_subject'); 
        }, 1500);
      }
    }
  };

  const getQuestionText = () => {
    if (status === 'asking_verb' || status === 'feedback_incorrect_verb') return "Quel est le verbe ?";
    if (status === 'asking_subject' || status === 'feedback_incorrect_subject') return "Quel est le sujet ?";
    if (status === 'loading') return "Je cherche une nouvelle phrase...";
    if (status === 'feedback_correct') return "Bravo ! C'est correct !";
    return "VerbeHero";
  };

  const isSentenceInteractive = status === 'asking_verb' || status === 'asking_subject';
  const isFeedbackIncorrect = status === 'feedback_incorrect_verb' || status === 'feedback_incorrect_subject';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8 text-center select-none">
      {showFireworks && <FireworksAnimation />}
      
      <header className="w-full flex justify-between items-center mb-6 md:mb-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary drop-shadow-md">VerbeHero</h1>
        <div className="flex items-center bg-primary text-primary-foreground p-2 sm:p-3 rounded-lg shadow-lg">
          <Star className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300" />
          <span className="ml-2 text-2xl sm:text-3xl font-bold">{score}</span>
        </div>
      </header>

      <Card className="w-full max-w-3xl shadow-2xl rounded-xl overflow-hidden">
        <CardContent className="p-6 sm:p-8 md:p-10">
          <div className="mb-6 md:mb-8 min-h-[80px] sm:min-h-[100px] flex flex-col items-center justify-center"> {/* Increased min-h for progress bar */}
            {status === 'loading' ? (
              <div className="flex flex-col items-center justify-center text-center gap-3 w-full">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" />
                <p className="text-lg text-muted-foreground mt-2">{getQuestionText()}</p>
                <Progress value={progressValue} className="w-3/4 max-w-xs mt-2" />
              </div>
            ) : (
              <>
                <div className="flex items-center text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-secondary-foreground">
                  { (status === 'asking_verb' || status === 'asking_subject') && <Brain className="w-8 h-8 sm:w-10 sm:h-10 mr-3 text-primary" /> }
                  { status.startsWith('feedback_incorrect') && <MessageCircleQuestion className="w-8 h-8 sm:w-10 sm:h-10 mr-3 text-destructive" /> }
                  { status === 'feedback_correct' && <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 mr-3 text-accent" /> }
                  <h2>{getQuestionText()}</h2>
                </div>
                { isFeedbackIncorrect && <p className="text-destructive text-lg">Essaie encore !</p>}
                { status === 'feedback_correct' && !showFireworks && <p className="text-accent text-lg">Super !</p>}
              </>
            )}
          </div>
          
          {words.length > 0 && status !== 'loading' && (
            <div 
              className={cn(
                "flex flex-wrap justify-center items-center gap-2 sm:gap-3 p-4 sm:p-6 mb-6 md:mb-8 min-h-[100px] sm:min-h-[150px] bg-secondary/30 rounded-lg",
                isFeedbackIncorrect && "animate-shake border-2 border-destructive"
              )}
            >
              {words.map((word, index) => (
                <WordChip
                  key={index}
                  word={word}
                  isSelected={selectedIndices.includes(index)}
                  onClick={() => handleWordClick(index)}
                  disabled={!isSentenceInteractive}
                />
              ))}
            </div>
          )}

          { (status === 'asking_verb' || status === 'asking_subject') && (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={selectedIndices.length === 0 || status === 'loading'}
              className="w-full sm:w-auto text-2xl sm:text-3xl px-10 py-6 sm:px-12 sm:py-7 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200"
            >
              Valider
            </Button>
          )}

          { status === 'loading' && (
             <div className="h-[76px]"> {/* Placeholder for button height */} </div>
          )}

           { (status.startsWith('feedback_incorrect')) && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setSelectedIndices([]);
                if(status === 'feedback_incorrect_verb') setStatus('asking_verb');
                if(status === 'feedback_incorrect_subject') setStatus('asking_subject');
              }}
              className="w-full sm:w-auto text-2xl sm:text-3xl px-10 py-6 sm:px-12 sm:py-7 rounded-xl shadow-lg"
            >
              Réessayer
              <RefreshCw className="ml-2 w-6 h-6" />
            </Button>
          )}
        </CardContent>
      </Card>

      <footer className="mt-8 text-sm text-muted-foreground">
        Appuyez sur les mots pour les sélectionner.
      </footer>
    </div>
  );
}


function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  )
}
