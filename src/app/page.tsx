
// @/app/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WordChip } from '@/components/game/WordChip';
import { FireworksAnimation } from '@/components/animations/FireworksAnimation';
import { Progress } from "@/components/ui/progress";
import { Brain, MessageCircleQuestion, Loader2, RefreshCw, SparklesIcon as SparklesLucide } from 'lucide-react';
import { cn } from '@/lib/utils';

type GameStatus =
  | 'initial_loading'
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
  if (!partToFind || partToFind.trim() === "") {
    return [];
  }

  const partWords = partToFind.toLowerCase().split(' ');

  for (let i = 0; i <= sentenceWords.length - partWords.length; i++) {
    let match = true;
    for (let j = 0; j < partWords.length; j++) {
      const sentenceWordClean = sentenceWords[i + j].replace(/[.,!?;:]$/, '').toLowerCase();
      const partWordClean = partWords[j].replace(/[.,!?;:]$/, '');

      if (sentenceWordClean !== partWordClean) {
        match = false;
        break;
      }
    }
    if (match) {
      const indices = Array.from({ length: partWords.length }, (_, k) => i + k);
      return indices;
    }
  }
  return [];
};

const fallbackSentences: SentenceData[] = [
  { phrase: "Le chien court vite.", sujet: "Le chien", verbe: "court" },
  { phrase: "Elle dessine un chat.", sujet: "Elle", verbe: "dessine" },
  { phrase: "L'oiseau vole haut.", sujet: "L'oiseau", verbe: "vole" },
  { phrase: "Le soleil brille fort.", sujet: "Le soleil", verbe: "brille" },
  { phrase: "Maman prépare le repas.", sujet: "Maman", verbe: "prépare" },
  { phrase: "L'abeille butine la fleur.", sujet: "L'abeille", verbe: "butine"}
];

export default function PetitAdamPage() {
  const [sentence, setSentence] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [correctVerbIndices, setCorrectVerbIndices] = useState<number[]>([]);
  const [correctSubjectIndices, setCorrectSubjectIndices] = useState<number[]>([]);

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>('initial_loading');
  const [showFireworks, setShowFireworks] = useState(false);

  const [loadingProgressValue, setLoadingProgressValue] = useState(0);
  const [isScoreAnimating, setIsScoreAnimating] = useState(false);
  const [lastCorrectStage, setLastCorrectStage] = useState<'verb' | 'subject' | null>(null);
  const [buttonParticles, setButtonParticles] = useState<ButtonParticle[]>([]);
  const validateButtonRef = useRef<HTMLButtonElement>(null);
  const [currentQuestionAnimKey, setCurrentQuestionAnimKey] = useState(0);
  
  const [cashRegisterSound, setCashRegisterSound] = useState<HTMLAudioElement | null>(null);
  const [goodAnswerSound, setGoodAnswerSound] = useState<HTMLAudioElement | null>(null);
  const [errorSound, setErrorSound] = useState<HTMLAudioElement | null>(null);

  const [allSentences, setAllSentences] = useState<SentenceData[]>([]);
  const [lastUsedSentenceIndex, setLastUsedSentenceIndex] = useState<number | null>(null);
  const [initialSentenceLoaded, setInitialSentenceLoaded] = useState(false);


  const playSound = useCallback((type: 'verb_correct' | 'points_awarded' | 'error') => {
    if (type === 'verb_correct') {
      if (goodAnswerSound) {
        goodAnswerSound.currentTime = 0;
        goodAnswerSound.play().catch(e => console.error('Error playing existing goodAnswerSound:', e));
      } else {
        try {
          const audio = new Audio('/sounds/good-answer.mp3');
          audio.preload = 'auto';
          setGoodAnswerSound(audio); 
          audio.play().catch(e => console.error('Error playing new goodAnswerSound:', e));
        } catch (e) {
          console.error('Error creating goodAnswerSound on demand:', e);
        }
      }
    } else if (type === 'points_awarded') {
      if (cashRegisterSound) {
        cashRegisterSound.currentTime = 0;
        cashRegisterSound.play().catch(e => console.error('Error playing existing cashRegisterSound:', e));
      } else {
        try {
          const audio = new Audio('/sounds/cash-register.mp3');
          audio.preload = 'auto';
          setCashRegisterSound(audio); 
          audio.play().catch(e => console.error('Error playing new cashRegisterSound:', e));
        } catch (e) {
          console.error('Error creating cashRegisterSound on demand:', e);
        }
      }
    } else if (type === 'error') {
      if (errorSound) {
        errorSound.currentTime = 0;
        errorSound.play().catch(e => console.error('Error playing existing errorSound:', e));
      } else {
        try {
          const audio = new Audio('/sounds/error-sound.mp3');
          audio.preload = 'auto';
          setErrorSound(audio); 
          audio.play().catch(e => console.error('Error playing new errorSound:', e));
        } catch (e) {
          console.error('Error creating errorSound on demand:', e);
        }
      }
    }
  }, [goodAnswerSound, cashRegisterSound, errorSound]);

  useEffect(() => {
    setStatus('initial_loading');
    setLoadingProgressValue(0);
    
    fetch('/data/sentences.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: SentenceData[]) => {
        if (data && data.length > 0) {
          setAllSentences(data);
        } else {
          setAllSentences(fallbackSentences);
        }
      })
      .catch(error => {
        console.error(`Failed to fetch sentences.json: ${error.message}`, error);
        setAllSentences(fallbackSentences);
      });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          // console.log(`SW registered: `, registration);
        }).catch(registrationError => {
          console.error(`SW registration failed: `, registrationError);
        });
      });
    }
  }, []); 

  const processPhrase = (phrase: string): string[] => {
    const wordsArray = phrase.match(/\b[\p{L}\p{N}'-]+[.,!?;:]*|\S/gu) || [];
    
    const processedWords: string[] = [];
    let i = 0;
    while (i < wordsArray.length) {
        const currentWord = wordsArray[i];
        if (/^(l'|d'|s'|qu')$/i.test(currentWord) && i + 1 < wordsArray.length && /^\p{L}+/u.test(wordsArray[i+1])) {
            processedWords.push(currentWord + wordsArray[i+1]);
            i += 2;
        } 
        else if (currentWord.toLowerCase() === "n'" && i + 1 < wordsArray.length && /^(est|ai|as|a|avons|avez|ont|étais|était|étions|étiez|étaient|suis|es|sommes|êtes|sont)/i.test(wordsArray[i+1])) {
             processedWords.push(currentWord);
             processedWords.push(wordsArray[i+1]);
             i+=2;
        }
        else {
            processedWords.push(currentWord);
            i += 1;
        }
    }
    return processedWords;
  };


  const fetchNewSentence = useCallback(async () => {
    if (allSentences.length === 0) {
      setStatus('initial_loading'); 
      return;
    }

    setStatus('loading');
    setSelectedIndices([]);
    setWords([]); 
    setCorrectVerbIndices([]);
    setCorrectSubjectIndices([]);
    setLoadingProgressValue(0);

    let progressIntervalId: NodeJS.Timeout | undefined = undefined;
    let currentProgress = 0;

    try {
      progressIntervalId = setInterval(() => {
        currentProgress += 20;
        if (currentProgress <= 100) {
          setLoadingProgressValue(currentProgress);
        } else {
          setLoadingProgressValue(100);
        }
      }, 50);

      let availableSentences = allSentences;
      if (allSentences.length > 1 && lastUsedSentenceIndex !== null) {
        availableSentences = allSentences.filter((_, index) => index !== lastUsedSentenceIndex);
        if (availableSentences.length === 0) { 
            availableSentences = allSentences; 
        }
      }

      const randomIndex = Math.floor(Math.random() * availableSentences.length);
      const selectedSentenceObject = availableSentences[randomIndex];

      const originalIndex = allSentences.findIndex(s => s.phrase === selectedSentenceObject.phrase);
      setLastUsedSentenceIndex(originalIndex);

      const currentWords = processPhrase(selectedSentenceObject.phrase);
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

    } catch (error: any) {
      console.error(`fetchNewSentence - Error: ${error.message}`, error);
      if (progressIntervalId) {
        clearInterval(progressIntervalId);
        progressIntervalId = undefined;
      }
      setLoadingProgressValue(100); 

      const fallbackSentenceData = fallbackSentences[Math.floor(Math.random() * fallbackSentences.length)];
      const processedFallbackWords = processPhrase(fallbackSentenceData.phrase);
      const fallbackSubjectIndices = findPartIndices(processedFallbackWords, fallbackSentenceData.sujet);
      const fallbackVerbIndices = findPartIndices(processedFallbackWords, fallbackSentenceData.verbe);

      setSentence(fallbackSentenceData.phrase);
      setWords(processedFallbackWords);
      setCorrectSubjectIndices(fallbackSubjectIndices);
      setCorrectVerbIndices(fallbackVerbIndices);
      setCurrentQuestionAnimKey(prevKey => prevKey + 1);

      setTimeout(() => {
        setStatus('asking_verb');
      }, 300);
    }
  }, [allSentences, lastUsedSentenceIndex]); 

  useEffect(() => {
    if (allSentences.length > 0 && !initialSentenceLoaded) {
      fetchNewSentence();
      setInitialSentenceLoaded(true); 
    }
  }, [allSentences, initialSentenceLoaded, fetchNewSentence]);


  const handleWordClick = (index: number) => {
    if (status !== 'asking_verb' && status !== 'asking_subject') return;

    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a,b) => a-b)
    );
  };

  const checkAnswer = (indicesToCheck: number[]): boolean => {
    if (selectedIndices.length !== indicesToCheck.length) return false;
    if (indicesToCheck.length === 0 && selectedIndices.length === 0) return true; 
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
      isCorrect = checkAnswer(correctVerbIndices);

      if (isCorrect) {
        setLastCorrectStage('verb');
        setStatus('feedback_correct');
        setShowFireworks(true);
        playSound('verb_correct');
        setSelectedIndices([]); 
        setTimeout(() => {
          setShowFireworks(false);
          setStatus('asking_subject'); 
          setCurrentQuestionAnimKey(prevKey => prevKey + 1); 
        }, 1500); 
      } else {
        setStatus('feedback_incorrect_verb');
        playSound('error');
        setSelectedIndices([]); 
        setTimeout(() => {
          setStatus('asking_verb'); 
        }, 1500);
      }
    } else if (status === 'asking_subject') {
      isCorrect = checkAnswer(correctSubjectIndices);

      if (isCorrect) {
        setLastCorrectStage('subject');
        setStatus('feedback_correct');
        setShowFireworks(true);
        playSound('points_awarded');
        setScore(s => s + 10);
        setIsScoreAnimating(true);
        setTimeout(() => setIsScoreAnimating(false), 300); 

        setSelectedIndices([]); 
        setTimeout(() => {
          setShowFireworks(false);
          if (allSentences.length > 0) { 
            fetchNewSentence(); 
          }
        }, 1500); 
      } else {
        setStatus('feedback_incorrect_subject');
        playSound('error');
        setSelectedIndices([]); 
         setTimeout(() => {
          setStatus('asking_subject');
        }, 1500);
      }
    }
  };
  
  const getQuestionText = () => {
    if (status === 'initial_loading') return "Chargement des phrases...";
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

  const shouldApplyWavyAnimation =
    (questionText === mainQuestionVerb && (status === 'asking_verb' || (status === 'feedback_correct' && lastCorrectStage === 'subject'))) || 
    (questionText === mainQuestionSubject && status === 'asking_subject'); 


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8 text-center select-none">
      {showFireworks && <FireworksAnimation />}
      
      <header className="w-full flex justify-between items-center mb-6 md:mb-10">
        <div className="w-1/3 flex justify-start">
          <Image 
            src="/images/petit-adam-logo.png" 
            alt="Petit Adam Logo" 
            width={120} 
            height={95} 
            className="drop-shadow-md sm:w-[150px] sm:h-[118px] md:w-[200px] md:h-[158px]"
            priority
            data-ai-hint="child education"
          />
        </div>
        <div className="w-1/3 flex justify-end">
          <div className={cn(
            "flex items-center bg-primary text-primary-foreground p-2 sm:p-3 rounded-lg shadow-lg",
            "transition-transform duration-300 ease-in-out",
            isScoreAnimating && "scale-110"
          )}>
            <Image 
              src="/images/coin.png"
              alt="Coin"
              width={24} 
              height={24}
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8"
              data-ai-hint="coin money"
            />
            <span className="ml-1 sm:ml-2 mr-2 sm:mr-3 text-xl sm:text-2xl md:text-3xl font-bold">{score}</span>
          </div>
        </div>
      </header>

      <Card className="w-full max-w-3xl shadow-2xl rounded-xl overflow-hidden transition-all duration-300">
        <CardContent className="p-4 sm:p-6 md:p-10">
          <div className="mb-4 sm:mb-6 md:mb-8 min-h-[60px] sm:min-h-[80px] md:min-h-[100px] flex flex-col items-center justify-center">
            { (status === 'loading' || status === 'initial_loading') ? (
              <div className="flex flex-col items-center justify-center text-center gap-2 sm:gap-3 w-full">
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary animate-spin" />
                <p className="text-base sm:text-lg text-muted-foreground mt-2">{questionText}</p>
                <Progress value={loadingProgressValue} className="w-3/4 max-w-xs mt-2" />
              </div>
            ) : (
              <>
                <div className="flex items-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mb-1 sm:mb-2 text-secondary-foreground">
                  { (status === 'asking_verb' || status === 'asking_subject') && <Brain className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 mr-2 sm:mr-3 text-primary" /> }
                  { isFeedbackIncorrect && <MessageCircleQuestion className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 mr-2 sm:mr-3 text-destructive" /> }
                  { status === 'feedback_correct' && !showFireworks && <SparklesLucide className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 mr-2 sm:mr-3 text-accent" /> }
                  
                  <h2 key={currentQuestionAnimKey}> 
                    {shouldApplyWavyAnimation
                      ? questionText.split('').map((char, index) => (
                          <span
                            key={`${char}-${index}-${currentQuestionAnimKey}`} 
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
                {isFeedbackIncorrect && <p className="text-destructive text-base sm:text-lg">Essaie encore !</p>}
                {status === 'feedback_correct' && !showFireworks && <p className="text-accent text-base sm:text-lg">Super !</p>}
              </>
            )}
          </div>
          
          {words.length > 0 && status !== 'loading' && status !== 'initial_loading' && (
            <div 
              className={cn(
                "flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 md:gap-3 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8 min-h-[80px] sm:min-h-[100px] md:min-h-[150px] bg-secondary/30 rounded-lg",
                (isFeedbackIncorrect && status === 'feedback_incorrect_verb') && "animate-shake border-2 border-destructive",
                (isFeedbackIncorrect && status === 'feedback_incorrect_subject') && "animate-shake border-2 border-destructive"
              )}
            >
              {words.map((word, index) => (
                <WordChip
                  key={`${word}-${index}`} 
                  word={word}
                  isSelected={selectedIndices.includes(index)}
                  onClick={() => handleWordClick(index)}
                  disabled={!isSentenceInteractive}
                />
              ))}
            </div>
          )}
           {(words.length === 0 && status !== 'loading' && status !== 'initial_loading') && (
             <div className="min-h-[80px] sm:min-h-[100px] md:min-h-[150px] mb-4 sm:mb-6 md:mb-8"> </div>
           )}

          <div className="h-auto flex flex-col items-center justify-center">
            <div className="h-[60px] sm:h-[70px] md:h-[76px] flex items-center justify-center relative w-full sm:w-auto"> 
              {buttonParticles.map(particle => (
                <div key={particle.id} className="button-particle" style={particle.style} />
              ))}
              {(status === 'asking_verb' || status === 'asking_subject' || isFeedbackIncorrect) && (
                <Button
                  ref={validateButtonRef}
                  size="lg"
                  onClick={handleSubmit}
                  disabled={selectedIndices.length === 0 || status === 'loading' || status === 'initial_loading'}
                  className="w-full sm:w-auto text-xl sm:text-2xl md:text-3xl px-8 py-4 sm:px-10 sm:py-5 md:px-12 md:py-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200"
                >
                  Valider
                </Button>
              )}
            </div>
             {(status === 'asking_verb' || status === 'asking_subject' || status === 'feedback_incorrect_verb' || status === 'feedback_incorrect_subject') && (
              <Button
                variant="link"
                className="mt-3 sm:mt-4 text-muted-foreground text-xs sm:text-sm"
                onClick={() => {
                  if (status !== 'loading' && status !== 'initial_loading' && allSentences.length > 0) {
                    setSelectedIndices([]); 
                    fetchNewSentence();
                  }
                }}
                disabled={status === 'loading' || status === 'initial_loading' || allSentences.length === 0}
              >
                <RefreshCw className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Passer / Nouvelle phrase
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <footer className="mt-6 sm:mt-8 text-xs sm:text-sm text-muted-foreground">
        Appuyez sur les mots pour les sélectionner.
      </footer>
    </div>
  );
}
    

    
