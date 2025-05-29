// @/app/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
// Removed: import { generateFrenchSentence } from '@/ai/flows/generate-french-sentence';
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

interface SentenceData {
  phrase: string;
  sujet: string;
  verbe: string;
}

const findPartIndices = (sentenceWords: string[], partToFind: string): number[] => {
  if (!partToFind || partToFind.trim() === "") return [];

  const partWords = partToFind.split(' ');
  
  for (let i = 0; i <= sentenceWords.length - partWords.length; i++) {
    let match = true;
    for (let j = 0; j < partWords.length; j++) {
      const sentenceWordClean = sentenceWords[i + j].replace(/[.,!?;:]$/, '');
      const partWordClean = partWords[j].replace(/[.,!?;:]$/, '');

      if (sentenceWordClean !== partWordClean) {
        match = false;
        break;
      }
    }
    if (match) {
      return Array.from({ length: partWords.length }, (_, k) => i + k);
    }
  }
  return [];
};

const fallbackSentences: SentenceData[] = [
  { phrase: "Le chien court vite.", sujet: "Le chien", verbe: "court" },
  { phrase: "Elle dessine un chat.", sujet: "Elle", verbe: "dessine" },
  { phrase: "L'oiseau vole haut.", sujet: "L'oiseau", verbe: "vole" },
];

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
  const [currentQuestionAnimKey, setCurrentQuestionAnimKey] = useState(0);
  const [cashRegisterSound, setCashRegisterSound] = useState<HTMLAudioElement | null>(null);
  const [allSentences, setAllSentences] = useState<SentenceData[]>([]);
  const [lastUsedSentenceIndex, setLastUsedSentenceIndex] = useState<number | null>(null);

  useEffect(() => {
    const audio = new Audio('/sounds/cash-register.mp3'); 
    audio.preload = 'auto';
    setCashRegisterSound(audio);

    // Fetch all sentences once on component mount
    fetch('/data/sentences.json')
      .then(res => res.json())
      .then((data: SentenceData[]) => {
        if (data && data.length > 0) {
          setAllSentences(data);
        } else {
          setAllSentences(fallbackSentences); // Use fallback if JSON is empty or invalid
        }
      })
      .catch(error => {
        console.error("Failed to fetch sentences.json:", error);
        setAllSentences(fallbackSentences); // Use fallback on error
      });
      
    return () => {
      if (audio) {
        audio.pause();
        // @ts-ignore
        audio.src = ''; 
      }
    };
  }, []);

  const fetchNewSentence = useCallback(async () => {
    setStatus('loading');
    setSelectedIndices([]);
    setSentence('');
    setWords([]);
    setLoadingProgressValue(0);
    
    // Ensure allSentences is loaded before proceeding
    if (allSentences.length === 0) {
      console.log("Sentences not loaded yet, trying again in 100ms");
      setTimeout(fetchNewSentence, 100); // Retry if sentences aren't loaded
      return;
    }

    let progressIntervalId: NodeJS.Timeout | undefined = undefined;

    try {
      currentProgress = 0; // Reset progress for the interval
      progressIntervalId = setInterval(() => {
        currentProgress += 20; // Faster progress for local fetch
        if (currentProgress <= 100) {
          setLoadingProgressValue(currentProgress);
        } else {
          setLoadingProgressValue(100); 
        }
      }, 50); // Faster interval

      let availableSentences = allSentences;
      if (allSentences.length > 1 && lastUsedSentenceIndex !== null) {
        availableSentences = allSentences.filter((_, index) => index !== lastUsedSentenceIndex);
      }
      
      const randomIndex = Math.floor(Math.random() * availableSentences.length);
      const selectedSentenceObject = availableSentences[randomIndex];
      
      // Find original index in allSentences to store as lastUsedSentenceIndex
      const originalIndex = allSentences.findIndex(s => s.phrase === selectedSentenceObject.phrase);
      setLastUsedSentenceIndex(originalIndex);


      const currentWords = selectedSentenceObject.phrase.split(' ');
      const currentSubjectIndices = findPartIndices(currentWords, selectedSentenceObject.sujet);
      const currentVerbIndices = findPartIndices(currentWords, selectedSentenceObject.verbe);

      if (progressIntervalId) {
        clearInterval(progressIntervalId);
        progressIntervalId = undefined;
      }
      setLoadingProgressValue(100); 

      setSentence(selectedSentenceObject.phrase);
      setWords(currentWords);
      setCorrectSubjectIndices(currentSubjectIndices);
      setCorrectVerbIndices(currentVerbIndices);
      setCurrentQuestionAnimKey(prevKey => prevKey + 1);
      
      setTimeout(() => { 
        setStatus('asking_verb'); 
      }, 300);

    } catch (error) {
      console.error("Failed to process sentence:", error);
      if (progressIntervalId) {
        clearInterval(progressIntervalId);
        progressIntervalId = undefined;
      }
      setLoadingProgressValue(100); 

      // Use a fallback sentence from the hardcoded list
      const fallbackSentenceData = fallbackSentences[Math.floor(Math.random() * fallbackSentences.length)];
      const fallbackWords = fallbackSentenceData.phrase.split(' ');
      const fallbackSubjectIndices = findPartIndices(fallbackWords, fallbackSentenceData.sujet);
      const fallbackVerbIndices = findPartIndices(fallbackWords, fallbackSentenceData.verbe);

      setSentence(fallbackSentenceData.phrase); 
      setWords(fallbackWords);
      setCorrectSubjectIndices(fallbackSubjectIndices);
      setCorrectVerbIndices(fallbackVerbIndices);
      setCurrentQuestionAnimKey(prevKey => prevKey + 1);
      
      setTimeout(() => { 
        setStatus('asking_verb'); 
      }, 300);
    }
  }, [allSentences, lastUsedSentenceIndex]); 

  let currentProgress = 0; // Hoisted for interval access

  useEffect(() => {
    if (allSentences.length > 0) { // Only fetch new sentence if allSentences are loaded
        fetchNewSentence();
    }
  }, [allSentences, fetchNewSentence]); // Rerun if allSentences changes (i.e., on initial load)


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
    if (!parentElement) return; 
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
        } as React.CSSProperties, 
      });
    }
    setButtonParticles(newParticles);
    setTimeout(() => setButtonParticles([]), 600); 
  };

  const handleSubmit = () => {
    triggerButtonAnimation();
    let isCorrect = false;
    if (status === 'asking_verb') {
      if (correctVerbIndices.length === 0 && selectedIndices.length === 0) { // Correct for implied verb/no verb phrase?
        isCorrect = true; // Or handle as error if verb is always expected. For now, assume correct if JSON implies no verb.
      } else {
        isCorrect = checkAnswer(correctVerbIndices);
      }

      if (isCorrect) {
        setLastCorrectStage('verb');
        setStatus('feedback_correct');
        setShowFireworks(true);
        if (cashRegisterSound) {
          cashRegisterSound.currentTime = 0; 
          cashRegisterSound.play().catch(error => console.error("Error playing sound:", error));
        }
        setSelectedIndices([]); 
        setTimeout(() => {
          setShowFireworks(false);
          setStatus('asking_subject'); 
          setCurrentQuestionAnimKey(prevKey => prevKey + 1); 
        }, 1500); 
      } else {
        setStatus('feedback_incorrect_verb');
        setSelectedIndices([]); 
        setTimeout(() => {
          setStatus('asking_verb'); 
          // No need to re-trigger wavy animation for same question on error
        }, 1500);
      }
    } else if (status === 'asking_subject') {
      if (correctSubjectIndices.length === 0 && selectedIndices.length === 0) { // Correct for imperative
        isCorrect = true;
      } else {
        isCorrect = checkAnswer(correctSubjectIndices);
      }

      if (isCorrect) {
        setLastCorrectStage('subject');
        setStatus('feedback_correct');
        setShowFireworks(true);
        if (cashRegisterSound) {
          cashRegisterSound.currentTime = 0;
          cashRegisterSound.play().catch(error => console.error("Error playing sound:", error));
        }
        setScore(s => s + 10);
        setIsScoreAnimating(true);
        setTimeout(() => {
          setIsScoreAnimating(false);
        }, 300); 
        setTimeout(() => {
          setShowFireworks(false);
          if (allSentences.length > 0) { // Ensure sentences are loaded before fetching new one
            fetchNewSentence();
          }
        }, 1500); 
      } else {
        setStatus('feedback_incorrect_subject');
        setSelectedIndices([]); 
         setTimeout(() => {
          setStatus('asking_subject');
          // No need to re-trigger wavy animation for same question on error
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
        <Image 
          src="/images/petit-adam-logo.png" 
          alt="Petit Adam Logo" 
          width={200}
          height={158} 
          className="drop-shadow-md"
          priority
        />
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
                  
                  <h2 key={currentQuestionAnimKey}>
                    {shouldApplyWavyAnimation
                      ? questionText.split('').map((char, index) => (
                          <span
                            key={index}
                            className="wavy-text-letter"
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            {char === ' ' ? '\u00A0' : char}
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
             <div className="min-h-[100px] sm:min-h-[150px] mb-6 md:mb-8"> </div>
           )}

          <div className="h-auto flex flex-col items-center justify-center">
            <div className="h-[76px] flex items-center justify-center relative w-full sm:w-auto"> 
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
             {(status !== 'loading' && status !== 'feedback_correct') && (
              <Button
                variant="link"
                className="mt-4 text-muted-foreground text-sm"
                onClick={() => {
                  if (status !== 'loading' && allSentences.length > 0) { 
                    setSelectedIndices([]); 
                    fetchNewSentence();
                  }
                }}
                disabled={status === 'loading' || allSentences.length === 0}
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