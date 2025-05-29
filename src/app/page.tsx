
// @/app/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { generateFrenchSentence } from '@/ai/flows/generate-french-sentence';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WordChip } from '@/components/game/WordChip';
import { FireworksAnimation } from '@/components/animations/FireworksAnimation';
import { Progress } from "@/components/ui/progress";
import { Star, Brain, MessageCircleQuestion, Loader2, RefreshCw, SparklesIcon as SparklesLucide } from 'lucide-react';
import { cn } from '@/lib/utils';

type GameStatus = 
  | 'loading' 
  | 'asking_verb' 
  | 'asking_subject' 
  | 'feedback_correct' 
  | 'feedback_incorrect_verb' 
  | 'feedback_incorrect_subject';

interface ButtonParticle {
  id: number;
  style: React.CSSProperties;
}

export default function PetitAdamPage() {
  const [sentence, setSentence] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [correctVerbIndices, setCorrectVerbIndices] = useState<number[]>([]);
  const [correctSubjectIndices, setCorrectSubjectIndices] = useState<number[]>([]);
  
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>('loading');
  const [showFireworks, setShowFireworks] = useState(false);
  
  const [loadingProgressValue, setLoadingProgressValue] = useState(0);
  const [isScoreAnimating, setIsScoreAnimating] = useState(false);
  const [lastCorrectStage, setLastCorrectStage] = useState<'verb' | 'subject' | null>(null);
  const [buttonParticles, setButtonParticles] = useState<ButtonParticle[]>([]);
  const validateButtonRef = useRef<HTMLButtonElement>(null);


  const fetchNewSentence = useCallback(async () => {
    setStatus('loading');
    setSelectedIndices([]);
    setSentence('');
    setWords([]);
    let progressIntervalId: NodeJS.Timeout | undefined = undefined;

    try {
      console.log("Fetching new sentence...");
      setLoadingProgressValue(0);
      let currentProgress = 0;
      progressIntervalId = setInterval(() => {
        currentProgress += 10;
        if (currentProgress <= 100) {
          setLoadingProgressValue(currentProgress);
        } else {
          // Ensure it visually hits 100% but don't clear interval here
          // as the API call might still be pending.
          setLoadingProgressValue(100); 
        }
      }, 100);

      const result = await generateFrenchSentence({});
      
      if (progressIntervalId) {
        clearInterval(progressIntervalId);
        progressIntervalId = undefined;
      }
      setLoadingProgressValue(100); 

      console.log("New sentence data:", result);
      setSentence(result.sentence);
      setWords(result.words);
      setCorrectSubjectIndices(result.subjectIndices);
      setCorrectVerbIndices(result.verbIndices);
      
      setTimeout(() => { 
        setStatus('asking_verb'); 
      }, 300); // Brief delay to show 100% progress

    } catch (error) {
      console.error("Failed to generate sentence:", error);
      if (progressIntervalId) {
        clearInterval(progressIntervalId);
        progressIntervalId = undefined;
      }
      setLoadingProgressValue(100); 

      // Use one of the updated fallbacks with correct structure
      const fallbacks = [
        { sentence: "Le chien court vite.", words: ["Le", "chien", "court", "vite."], subjectIndices: [0, 1], verbIndices: [2] },
        { sentence: "Elle dessine un chat.", words: ["Elle", "dessine", "un", "chat."], subjectIndices: [0], verbIndices: [1] },
        { sentence: "L'oiseau vole haut.", words: ["L'oiseau", "vole", "haut."], subjectIndices: [0], verbIndices: [1] },
        { sentence: "Maman prépare le gâteau.", words: ["Maman", "prépare", "le", "gâteau."], subjectIndices: [0], verbIndices: [1]},
        { sentence: "Le chat dort.", words: ["Le", "chat", "dort."], subjectIndices: [0,1], verbIndices: [2]},
        { sentence: "Regarde les étoiles!", words: ["Regarde", "les", "étoiles!"], subjectIndices: [], verbIndices: [0]},
      ];
      const fallbackSentence = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      setSentence(fallbackSentence.sentence); 
      setWords(fallbackSentence.words);
      setCorrectSubjectIndices(fallbackSentence.subjectIndices);
      setCorrectVerbIndices(fallbackSentence.verbIndices);
      
      setTimeout(() => { 
        setStatus('asking_verb'); 
      }, 300); // Brief delay
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    fetchNewSentence();
  }, [fetchNewSentence]);

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

  const triggerButtonAnimation = () => {
    if (!validateButtonRef.current) return;

    const buttonRect = validateButtonRef.current.getBoundingClientRect();
    const parentElement = validateButtonRef.current.parentElement;
    if (!parentElement) return; // Should not happen if ref is attached
    const containerRect = parentElement.getBoundingClientRect();

    const startX = buttonRect.left - containerRect.left + buttonRect.width / 2;
    const startY = buttonRect.top - containerRect.top + buttonRect.height / 2;

    const newParticles: ButtonParticle[] = [];
    const numParticles = 12;
    for (let i = 0; i < numParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 40 + 25; 
      const particleSize = 6; 

      newParticles.push({
        id: Math.random(),
        style: {
          left: `${startX - particleSize / 2}px`,
          top: `${startY - particleSize / 2}px`,
          width: `${particleSize}px`,
          height: `${particleSize}px`,
          '--tx-btn': `${Math.cos(angle) * radius}px`,
          '--ty-btn': `${Math.sin(angle) * radius}px`,
          animationDelay: `${Math.random() * 0.2}s`,
        } as React.CSSProperties, // Cast to React.CSSProperties
      });
    }
    setButtonParticles(newParticles);
    setTimeout(() => setButtonParticles([]), 600); // Particle animation duration
  };

  const handleSubmit = () => {
    triggerButtonAnimation();
    let isCorrect = false;
    if (status === 'asking_verb') {
      isCorrect = checkAnswer(correctVerbIndices);
      if (isCorrect) {
        setLastCorrectStage('verb');
        setStatus('feedback_correct');
        setShowFireworks(true);
        setSelectedIndices([]); 
        setTimeout(() => {
          setShowFireworks(false);
          setStatus('asking_subject'); 
        }, 1500); // Duration of fireworks + feedback
      } else {
        setStatus('feedback_incorrect_verb');
        setSelectedIndices([]); // Clear selection on incorrect answer
        setTimeout(() => {
          setStatus('asking_verb'); // Return to asking verb after feedback
        }, 1500);
      }
    } else if (status === 'asking_subject') {
      isCorrect = checkAnswer(correctSubjectIndices);
      if (isCorrect) {
        setLastCorrectStage('subject');
        setStatus('feedback_correct');
        setShowFireworks(true);
        setScore(s => s + 10);
        setIsScoreAnimating(true);
        setTimeout(() => {
          setIsScoreAnimating(false);
        }, 300); // Score animation duration
        setTimeout(() => {
          setShowFireworks(false);
          fetchNewSentence(); // Fetch new sentence after subject is correct
        }, 1500); // Duration of fireworks + feedback
      } else {
        setStatus('feedback_incorrect_subject');
        setSelectedIndices([]); // Clear selection on incorrect answer
         setTimeout(() => {
          setStatus('asking_subject'); // Return to asking subject after feedback
        }, 1500);
      }
    }
  };
  
  const getQuestionText = () => {
    if (status === 'loading') return "Je cherche une nouvelle phrase...";
    if (status === 'asking_verb' || status === 'feedback_incorrect_verb') return "Quel est le verbe ?";
    if (status === 'asking_subject' || status === 'feedback_incorrect_subject') return "Quel est le sujet ?";
    if (status === 'feedback_correct') {
        if (lastCorrectStage === 'verb') return "Bien joué pour le verbe !";
        if (lastCorrectStage === 'subject') return "Bravo ! Phrase complète !";
        return "Bravo ! C'est correct !";
    }
    return "Petit Adam";
  };

  const isSentenceInteractive = status === 'asking_verb' || status === 'asking_subject';
  const isFeedbackIncorrect = status === 'feedback_incorrect_verb' || status === 'feedback_incorrect_subject';

  const questionText = getQuestionText();
  const mainQuestionVerb = "Quel est le verbe ?";
  const mainQuestionSubject = "Quel est le sujet ?";
  const shouldApplyWavyAnimation = questionText === mainQuestionVerb || questionText === mainQuestionSubject;


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8 text-center select-none">
      {showFireworks && <FireworksAnimation />}
      
      <header className="w-full flex justify-between items-center mb-6 md:mb-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary drop-shadow-md">Petit Adam</h1>
        <div className={cn(
          "flex items-center bg-primary text-primary-foreground p-2 sm:p-3 rounded-lg shadow-lg",
          "transition-transform duration-300 ease-in-out",
          isScoreAnimating && "scale-110"
        )}>
          <Star className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300" />
          <span className="ml-2 text-2xl sm:text-3xl font-bold">{score}</span>
        </div>
      </header>

      <Card className="w-full max-w-3xl shadow-2xl rounded-xl overflow-hidden transition-all duration-300">
        <CardContent className="p-6 sm:p-8 md:p-10">
          <div className="mb-6 md:mb-8 min-h-[80px] sm:min-h-[100px] flex flex-col items-center justify-center">
            {status === 'loading' ? (
              <div className="flex flex-col items-center justify-center text-center gap-3 w-full">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" />
                <p className="text-lg text-muted-foreground mt-2">{questionText}</p>
                <Progress value={loadingProgressValue} className="w-3/4 max-w-xs mt-2" />
              </div>
            ) : (
              <>
                <div className="flex items-center text-2xl sm:text-3xl md:text-4xl font-semibold mb-2 text-secondary-foreground">
                  { (status === 'asking_verb' || status === 'asking_subject') && <Brain className="w-8 h-8 sm:w-10 sm:h-10 mr-3 text-primary" /> }
                  { isFeedbackIncorrect && <MessageCircleQuestion className="w-8 h-8 sm:w-10 sm:h-10 mr-3 text-destructive" /> }
                  { status === 'feedback_correct' && !showFireworks && <SparklesLucide className="w-8 h-8 sm:w-10 sm:h-10 mr-3 text-accent" /> }
                  
                  <h2 key={questionText + status}> {/* Key to re-trigger animation */}
                    {shouldApplyWavyAnimation
                      ? questionText.split('').map((char, index) => (
                          <span
                            key={index}
                            className="wavy-text-letter"
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            {char === ' ' ? '\u00A0' : char} {/* Non-breaking space */}
                          </span>
                        ))
                      : questionText
                    }
                  </h2>
                </div>
                {isFeedbackIncorrect && <p className="text-destructive text-lg">Essaie encore !</p>}
                {status === 'feedback_correct' && !showFireworks && <p className="text-accent text-lg">Super !</p>}
              </>
            )}
          </div>
          
          {words.length > 0 && status !== 'loading' && (
            <div 
              className={cn(
                "flex flex-wrap justify-center items-center gap-2 sm:gap-3 p-4 sm:p-6 mb-6 md:mb-8 min-h-[100px] sm:min-h-[150px] bg-secondary/30 rounded-lg",
                (isFeedbackIncorrect && status === 'feedback_incorrect_verb') && "animate-shake border-2 border-destructive",
                (isFeedbackIncorrect && status === 'feedback_incorrect_subject') && "animate-shake border-2 border-destructive"
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
           {(words.length === 0 && status !== 'loading') && (
             <div className="min-h-[100px] sm:min-h-[150px] mb-6 md:mb-8"> {/* Placeholder for spacing */} </div>
           )}

          <div className="h-auto flex flex-col items-center justify-center">
            <div className="h-[76px] flex items-center justify-center relative w-full sm:w-auto"> {/* Container for button and particles */}
              {buttonParticles.map(particle => (
                <div key={particle.id} className="button-particle" style={particle.style} />
              ))}
              {(status === 'asking_verb' || status === 'asking_subject' || isFeedbackIncorrect) && (
                <Button
                  ref={validateButtonRef}
                  size="lg"
                  onClick={handleSubmit}
                  disabled={selectedIndices.length === 0 || status === 'loading'}
                  className="w-full sm:w-auto text-2xl sm:text-3xl px-10 py-6 sm:px-12 sm:py-7 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200"
                >
                  Valider
                </Button>
              )}
            </div>
             {/* "Passer / Nouvelle phrase" button always visible unless loading */}
             {(status !== 'loading' && status !== 'feedback_correct') && (
              <Button
                variant="link"
                className="mt-4 text-muted-foreground text-sm"
                onClick={() => {
                  if (status !== 'loading') { // Double check to prevent race conditions
                    setSelectedIndices([]); 
                    fetchNewSentence();
                  }
                }}
                disabled={status === 'loading'}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Passer / Nouvelle phrase
              </Button>
            )}
          </div>

        </CardContent>
      </Card>

      <footer className="mt-8 text-sm text-muted-foreground">
        Appuyez sur les mots pour les sélectionner.
      </footer>
    </div>
  );
}
