
// @/app/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WordChip } from '@/components/game/WordChip';
import { FireworksAnimation } from '@/components/animations/FireworksAnimation';
import { Progress } from "@/components/ui/progress";
import { Star, Brain, MessageCircleQuestion, Loader2, RefreshCw, SparklesIcon as SparklesLucide } from 'lucide-react';
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
  const [errorSound, setErrorSound] = useState<HTMLAudioElement | null>(null);

  const [allSentences, setAllSentences] = useState<SentenceData[]>([]);
  const [lastUsedSentenceIndex, setLastUsedSentenceIndex] = useState<number | null>(null);
  const [initialSentenceLoaded, setInitialSentenceLoaded] = useState(false);

  const playSound = useCallback((type: 'success' | 'error') => {
    console.log(`LOG POINT 27: playSound called with type: ${type}`);
    if (type === 'success') {
      if (cashRegisterSound) {
        console.log('LOG POINT 28A: cashRegisterSound already exists. Playing.');
        cashRegisterSound.currentTime = 0;
        cashRegisterSound.play().catch(e => console.error('LOG POINT 28B: Error playing existing cashRegisterSound:', e));
      } else {
        try {
          console.log('LOG POINT 28C: Initializing cashRegisterSound on demand.');
          const audio = new Audio('/sounds/cash-register.mp3');
          audio.preload = 'auto';
          setCashRegisterSound(audio);
          console.log('LOG POINT 28D: cashRegisterSound initialized and set in state. Attempting to play. Src:', audio.src);
          audio.play().catch(e => console.error('LOG POINT 28E: Error playing new cashRegisterSound:', e));
        } catch (e) {
          console.error('LOG POINT 28F: Error creating cashRegisterSound on demand:', e);
        }
      }
    } else if (type === 'error') {
      if (errorSound) {
        console.log('LOG POINT 29A: errorSound already exists. Playing.');
        errorSound.currentTime = 0;
        errorSound.play().catch(e => console.error('LOG POINT 29B: Error playing existing errorSound:', e));
      } else {
        try {
          console.log('LOG POINT 29C: Initializing errorSound on demand.');
          const audio = new Audio('/sounds/error-sound.mp3');
          audio.preload = 'auto';
          setErrorSound(audio);
          console.log('LOG POINT 29D: errorSound initialized and set in state. Attempting to play. Src:', audio.src);
          audio.play().catch(e => console.error('LOG POINT 29E: Error playing new errorSound:', e));
        } catch (e) {
          console.error('LOG POINT 29F: Error creating errorSound on demand:', e);
        }
      }
    }
  }, [cashRegisterSound, errorSound]);


  useEffect(() => {
    console.log('LOG POINT 1: Main useEffect hook entered.');
    setStatus('initial_loading');
    setLoadingProgressValue(0);
    
    console.log('LOG POINT 2: Fetching sentences.json');
    fetch('/data/sentences.json')
      .then(res => {
        console.log('LOG POINT 7: sentences.json fetch response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: SentenceData[]) => {
        console.log('LOG POINT 8: sentences.json data received:', data);
        if (data && data.length > 0) {
          setAllSentences(data);
        } else {
          console.log('LOG POINT 9: sentences.json is empty or invalid, using fallback.');
          setAllSentences(fallbackSentences);
        }
      })
      .catch(error => {
        console.error(`LOG POINT 10: Failed to fetch sentences.json: ${error.message}`, error);
        setAllSentences(fallbackSentences);
      });

    console.log('LOG POINT 11: Checking for Service Worker support.');
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        console.log('LOG POINT 12: Attempting to register Service Worker.');
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log(`LOG POINT 13: SW registered: `, registration);
        }).catch(registrationError => {
          console.error(`LOG POINT 14: SW registration failed: `, registrationError);
        });
      });
    }
    console.log('LOG POINT 15: Main useEffect hook finished.');
  }, []); 

  const processPhrase = (phrase: string): string[] => {
    const rawWords = phrase.split(' ');
    const processedWords: string[] = [];
    let i = 0;
    while (i < rawWords.length) {
      const currentWord = rawWords[i];
      if (/^(l'|d'|s'|qu')$/i.test(currentWord) && i + 1 < rawWords.length && /^[a-zA-ZÀ-ÿœŒæÆçÇ]+/.test(rawWords[i+1])) {
        processedWords.push(currentWord + rawWords[i+1]);
        i += 2; 
      } else {
        processedWords.push(currentWord);
        i += 1;
      }
    }
    return processedWords;
  };


  const fetchNewSentence = useCallback(async () => {
    console.log('LOG POINT 17: fetchNewSentence called. Current allSentences.length:', allSentences.length);
    if (allSentences.length === 0) {
      console.log('LOG POINT 18: allSentences is empty, setting status to initial_loading.');
      setStatus('initial_loading'); 
      return;
    }

    console.log('LOG POINT 19: Setting status to loading in fetchNewSentence.');
    setStatus('loading');
    setSelectedIndices([]);
    setWords([]); 
    setCorrectVerbIndices([]);
    setCorrectSubjectIndices([]);
    setLoadingProgressValue(0);

    let progressIntervalId: NodeJS.Timeout | undefined = undefined;
    let currentProgress = 0;

    try {
      console.log('LOG POINT 20: Starting progress interval for loading new sentence.');
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
            console.log('LOG POINT 20A: All sentences used, resetting availableSentences to allSentences.');
            availableSentences = allSentences; 
        }
      }

      const randomIndex = Math.floor(Math.random() * availableSentences.length);
      const selectedSentenceObject = availableSentences[randomIndex];
      console.log('LOG POINT 21: Selected new sentence object:', selectedSentenceObject);

      const originalIndex = allSentences.findIndex(s => s.phrase === selectedSentenceObject.phrase);
      setLastUsedSentenceIndex(originalIndex);

      const currentWords = processPhrase(selectedSentenceObject.phrase);
      const currentSubjectIndices = findPartIndices(currentWords, selectedSentenceObject.sujet);
      const currentVerbIndices = findPartIndices(currentWords, selectedSentenceObject.verbe);
      console.log('LOG POINT 22: Processed words and indices:', currentWords, currentSubjectIndices, currentVerbIndices);


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
      console.log('LOG POINT 23: New sentence data set in state.');

      setTimeout(() => {
        console.log('LOG POINT 24: Setting status to asking_verb after timeout.');
        setStatus('asking_verb');
      }, 300); 

    } catch (error: any) {
      console.error(`LOG POINT 25A: fetchNewSentence - Error: ${error.message}`, error);
      if (progressIntervalId) {
        clearInterval(progressIntervalId);
        progressIntervalId = undefined;
      }
      setLoadingProgressValue(100); 

      const fallbackSentenceData = fallbackSentences[Math.floor(Math.random() * fallbackSentences.length)];
      const processedFallbackWords = processPhrase(fallbackSentenceData.phrase);
      const fallbackSubjectIndices = findPartIndices(processedFallbackWords, fallbackSentenceData.sujet);
      const fallbackVerbIndices = findPartIndices(processedFallbackWords, fallbackSentenceData.verbe);
      console.log('LOG POINT 25B: Using fallback sentence due to error:', fallbackSentenceData);

      setSentence(fallbackSentenceData.phrase);
      setWords(processedFallbackWords);
      setCorrectSubjectIndices(fallbackSubjectIndices);
      setCorrectVerbIndices(fallbackVerbIndices);
      setCurrentQuestionAnimKey(prevKey => prevKey + 1);

      setTimeout(() => {
        console.log('LOG POINT 25C: Setting status to asking_verb after fallback timeout.');
        setStatus('asking_verb');
      }, 300);
    }
  }, [allSentences, lastUsedSentenceIndex]); 

  useEffect(() => {
    console.log('LOG POINT 16: useEffect for initial sentence load. allSentences.length:', allSentences.length, 'initialSentenceLoaded:', initialSentenceLoaded);
    if (allSentences.length > 0 && !initialSentenceLoaded) {
      fetchNewSentence();
      setInitialSentenceLoaded(true); 
      console.log('LOG POINT 16A: Initial sentence fetched and initialSentenceLoaded set to true.');
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
    console.log('LOG POINT 26: handleSubmit called. Current status:', status);
    triggerButtonAnimation();
    let isCorrect = false;

    if (status === 'asking_verb') {
      isCorrect = checkAnswer(correctVerbIndices);
      console.log('LOG POINT 30: Asking verb. Correct verb indices:', correctVerbIndices, 'Selected indices:', selectedIndices, 'Is correct:', isCorrect);

      if (isCorrect) {
        console.log('LOG POINT 31: Verb is correct.');
        setLastCorrectStage('verb');
        setStatus('feedback_correct');
        setShowFireworks(true);
        playSound('success');
        setSelectedIndices([]); 
        setTimeout(() => {
          setShowFireworks(false);
          setStatus('asking_subject'); 
          setCurrentQuestionAnimKey(prevKey => prevKey + 1); 
          console.log('LOG POINT 32: Timeout after correct verb. Status asking_subject. New anim key.');
        }, 1500); 
      } else {
        console.log('LOG POINT 33: Verb is incorrect.');
        setStatus('feedback_incorrect_verb');
        playSound('error');
        setSelectedIndices([]); 
        setTimeout(() => {
          setStatus('asking_verb'); 
          console.log('LOG POINT 34: Timeout after incorrect verb. Status asking_verb.');
        }, 1500);
      }
    } else if (status === 'asking_subject') {
      isCorrect = checkAnswer(correctSubjectIndices);
      console.log('LOG POINT 35: Asking subject. Correct subject indices:', correctSubjectIndices, 'Selected indices:', selectedIndices, 'Is correct:', isCorrect);

      if (isCorrect) {
        console.log('LOG POINT 36: Subject is correct.');
        setLastCorrectStage('subject');
        setStatus('feedback_correct');
        setShowFireworks(true);
        playSound('success');
        setScore(s => s + 10);
        setIsScoreAnimating(true);
        setTimeout(() => setIsScoreAnimating(false), 300); 

        setSelectedIndices([]); 
        setTimeout(() => {
          setShowFireworks(false);
          if (allSentences.length > 0) { 
            console.log('LOG POINT 37: Timeout after correct subject. Fetching new sentence.');
            fetchNewSentence(); 
          }
        }, 1500); 
      } else {
        console.log('LOG POINT 38: Subject is incorrect.');
        setStatus('feedback_incorrect_subject');
        playSound('error');
        setSelectedIndices([]); 
         setTimeout(() => {
          setStatus('asking_subject');
          console.log('LOG POINT 39: Timeout after incorrect subject. Status asking_subject.');
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

  console.log('LOG POINT 0: PetitAdamPage component rendering or re-rendering. Status:', status);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8 text-center select-none">
      <h1>H1 TEST FINAL (v3)</h1>
      {showFireworks && <FireworksAnimation />}
      
      <header className="w-full flex justify-between items-center mb-6 md:mb-10">
        <Image 
          src="/images/petit-adam-logo.png" 
          alt="Petit Adam Logo" 
          width={200}
          height={158} 
          className="drop-shadow-md"
          priority
          data-ai-hint="child education"
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
            { (status === 'loading' || status === 'initial_loading') ? (
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
                {isFeedbackIncorrect && <p className="text-destructive text-lg">Essaie encore !</p>}
                {status === 'feedback_correct' && !showFireworks && <p className="text-accent text-lg">Super !</p>}
              </>
            )}
          </div>
          
          {words.length > 0 && status !== 'loading' && status !== 'initial_loading' && (
            <div 
              className={cn(
                "flex flex-wrap justify-center items-center gap-2 sm:gap-3 p-4 sm:p-6 mb-6 md:mb-8 min-h-[100px] sm:min-h-[150px] bg-secondary/30 rounded-lg",
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
                  disabled={selectedIndices.length === 0 || status === 'loading' || status === 'initial_loading'}
                  className="w-full sm:w-auto text-2xl sm:text-3xl px-10 py-6 sm:px-12 sm:py-7 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200"
                >
                  Valider
                </Button>
              )}
            </div>
             {(status === 'asking_verb' || status === 'asking_subject' || status === 'feedback_incorrect_verb' || status === 'feedback_incorrect_subject') && (
              <Button
                variant="link"
                className="mt-4 text-muted-foreground text-sm"
                onClick={() => {
                  console.log('LOG POINT 40: Passer / Nouvelle phrase clicked. Status:', status);
                  if (status !== 'loading' && status !== 'initial_loading' && allSentences.length > 0) {
                    setSelectedIndices([]); 
                    fetchNewSentence();
                  }
                }}
                disabled={status === 'loading' || status === 'initial_loading' || allSentences.length === 0}
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
