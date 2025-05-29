
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
  if (!partToFind || partToFind.trim() === "") return [];

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
      return Array.from({ length: partWords.length }, (_, k) => i + k);
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
  const [debugMessages, setDebugMessages] = useState<string[]>(['Page debug activated.']);

  const logToPage = useCallback((message: string) => {
    setDebugMessages(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]); // Keep last 20 messages
  }, []);

  useEffect(() => {
    logToPage('LOG POINT 0: PetitAdamPage component mounted.');
  }, [logToPage]);

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

  useEffect(() => {
    logToPage('LOG POINT 1: Main useEffect hook entered.');
    let localSuccessAudio: HTMLAudioElement | null = null;
    let localFailAudio: HTMLAudioElement | null = null;

    logToPage('LOG POINT 2: PRE-INIT successAudio.');
    try {
      localSuccessAudio = new Audio('/sounds/cash-register.mp3');
      localSuccessAudio.preload = 'auto';
      setCashRegisterSound(localSuccessAudio);
      logToPage(`LOG POINT 3: successAudio initialized. Path: /sounds/cash-register.mp3. Src: ${localSuccessAudio?.src}`);
    } catch (e: any) {
      logToPage(`LOG POINT 4: Error initializing successAudio: ${e.message}`);
    }

    logToPage('LOG POINT 5: PRE-INIT failAudio.');
    try {
      localFailAudio = new Audio('/sounds/error-sound.mp3');
      localFailAudio.preload = 'auto';
      setErrorSound(localFailAudio);
      logToPage(`LOG POINT 6: failAudio initialized. Path: /sounds/error-sound.mp3. Src: ${localFailAudio?.src}`);
    } catch (e: any) {
      logToPage(`LOG POINT 7: Error initializing failAudio: ${e.message}`);
    }
    
    logToPage('LOG POINT 8: After audio initializations.');

    setStatus('initial_loading');
    setLoadingProgressValue(0);

    fetch('/data/sentences.json')
      .then(res => {
        logToPage(`LOG POINT 9: sentences.json fetch response received. Status: ${res.status}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: SentenceData[]) => {
        logToPage(`LOG POINT 10: Fetched sentences.json data (first 2): ${JSON.stringify(data.slice(0,2))}...`);
        if (data && data.length > 0) {
          setAllSentences(data);
        } else {
          logToPage("LOG POINT 11: Sentences.json is empty or invalid, using fallback.");
          setAllSentences(fallbackSentences);
        }
      })
      .catch(error => {
        logToPage(`LOG POINT 12: Failed to fetch sentences.json: ${error.message}`);
        setAllSentences(fallbackSentences);
      });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          logToPage(`LOG POINT 13: SW registered: ${registration.scope}`);
        }).catch(registrationError => {
          logToPage(`LOG POINT 14: SW registration failed: ${registrationError.message}`);
        });
      });
    } else {
      logToPage('LOG POINT 14B: Service Worker not in navigator.');
    }

    return () => {
      logToPage('LOG POINT 15: Main useEffect cleanup running.');
      if (localSuccessAudio) {
        localSuccessAudio.pause();
      }
      if (localFailAudio) {
        localFailAudio.pause();
      }
    };
  }, [logToPage]); // logToPage is stable

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
    logToPage(`LOG POINT 16: fetchNewSentence called. allSentences.length: ${allSentences.length}`);
    if (allSentences.length === 0) {
      logToPage("LOG POINT 17: fetchNewSentence called but allSentences empty. Retrying might cause loop if initial fetch failed. Status is 'initial_loading'");
      setStatus('initial_loading'); 
      return;
    }

    setStatus('loading');
    setSelectedIndices([]);
    // setSentence(''); // Avoid clearing sentence to prevent intermediate re-renders if problematic
    setWords([]);
    setCorrectVerbIndices([]);
    setCorrectSubjectIndices([]);
    setLoadingProgressValue(0);

    let progressIntervalId: NodeJS.Timeout | undefined = undefined;
    let currentProgress = 0;

    try {
      logToPage('LOG POINT 18: fetchNewSentence - Starting progress interval.');
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
            logToPage("LOG POINT 18B: All sentences used, resetting availableSentences to allSentences.");
            availableSentences = allSentences; 
        }
      }

      const randomIndex = Math.floor(Math.random() * availableSentences.length);
      const selectedSentenceObject = availableSentences[randomIndex];
      logToPage(`LOG POINT 19: fetchNewSentence - Selected sentence: ${selectedSentenceObject.phrase}`);

      const originalIndex = allSentences.findIndex(s => s.phrase === selectedSentenceObject.phrase);
      setLastUsedSentenceIndex(originalIndex);

      const currentWords = processPhrase(selectedSentenceObject.phrase);
      const currentSubjectIndices = findPartIndices(currentWords, selectedSentenceObject.sujet);
      const currentVerbIndices = findPartIndices(currentWords, selectedSentenceObject.verbe);
      logToPage(`LOG POINT 20: fetchNewSentence - Words: ${currentWords.join('|')}, SubjIdx: ${currentSubjectIndices}, VerbIdx: ${currentVerbIndices}`);


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
        logToPage('LOG POINT 21: fetchNewSentence - Setting status to asking_verb.');
        setStatus('asking_verb');
      }, 300); 

    } catch (error: any) {
      logToPage(`LOG POINT 22: fetchNewSentence - Error: ${error.message}`);
      if (progressIntervalId) {
        clearInterval(progressIntervalId);
        progressIntervalId = undefined;
      }
      setLoadingProgressValue(100); 

      const fallbackSentenceData = fallbackSentences[Math.floor(Math.random() * fallbackSentences.length)];
      logToPage(`LOG POINT 22B: Using fallback sentence: ${fallbackSentenceData.phrase}`);
      const processedFallbackWords = processPhrase(fallbackSentenceData.phrase);
      const fallbackSubjectIndices = findPartIndices(processedFallbackWords, fallbackSentenceData.sujet);
      const fallbackVerbIndices = findPartIndices(processedFallbackWords, fallbackSentenceData.verbe);

      setSentence(fallbackSentenceData.phrase);
      setWords(processedFallbackWords);
      setCorrectSubjectIndices(fallbackSubjectIndices);
      setCorrectVerbIndices(fallbackVerbIndices);
      setCurrentQuestionAnimKey(prevKey => prevKey + 1);

      setTimeout(() => {
        logToPage('LOG POINT 23: fetchNewSentence (catch) - Setting status to asking_verb.');
        setStatus('asking_verb');
      }, 300);
    }
  }, [allSentences, lastUsedSentenceIndex, logToPage]); 

  useEffect(() => {
    logToPage(`LOG POINT 24: useEffect for initial sentence load. allSentences.length: ${allSentences.length}, initialSentenceLoaded: ${initialSentenceLoaded}`);
    if (allSentences.length > 0 && !initialSentenceLoaded) {
      logToPage('LOG POINT 25: Conditions met for initial fetchNewSentence.');
      fetchNewSentence();
      setInitialSentenceLoaded(true); 
    }
  }, [allSentences, initialSentenceLoaded, fetchNewSentence, logToPage]);


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
    logToPage(`LOG POINT 26: handleSubmit called. Current status: ${status}. Selected: ${selectedIndices.join(',')}`);
    triggerButtonAnimation();
    let isCorrect = false;

    if (status === 'asking_verb') {
      isCorrect = checkAnswer(correctVerbIndices);
      logToPage(`LOG POINT 27: handleSubmit (verb) - isCorrect: ${isCorrect}, Correct verb indices: ${correctVerbIndices.join(',')}`);

      if (isCorrect) {
        setLastCorrectStage('verb');
        setStatus('feedback_correct');
        setShowFireworks(true);
        if (cashRegisterSound) {
          logToPage('LOG POINT 28: Playing cashRegisterSound for correct verb.');
          cashRegisterSound.currentTime = 0; 
          cashRegisterSound.play().catch(error => logToPage(`LOG POINT 29: Error playing cashRegisterSound (verb): ${error.message}`));
        }
        setSelectedIndices([]); 
        setTimeout(() => {
          setShowFireworks(false);
          setStatus('asking_subject'); 
          setCurrentQuestionAnimKey(prevKey => prevKey + 1); 
          logToPage('LOG POINT 29B: Transitioned to asking_subject.');
        }, 1500); 
      } else {
        setStatus('feedback_incorrect_verb');
        logToPage(`LOG POINT 30: Incorrect verb. errorSound object check: ${errorSound ? 'exists' : 'null'}`);
        if (errorSound && typeof errorSound.play === 'function') {
          logToPage(`LOG POINT 31: errorSound object exists for verb error. Attempting to play. Src: ${errorSound.src}`);
          errorSound.currentTime = 0;
          errorSound.play().catch(error => logToPage(`LOG POINT 32: Error playing error sound (verb): ${error.message}`));
        } else {
          logToPage('LOG POINT 33: errorSound is null or not valid for incorrect verb.');
        }
        setSelectedIndices([]); 
        setTimeout(() => {
          setStatus('asking_verb'); 
          logToPage('LOG POINT 33B: Returned to asking_verb after incorrect.');
        }, 1500);
      }
    } else if (status === 'asking_subject') {
      isCorrect = checkAnswer(correctSubjectIndices);
      logToPage(`LOG POINT 34: handleSubmit (subject) - isCorrect: ${isCorrect}, Correct subject indices: ${correctSubjectIndices.join(',')}`);

      if (isCorrect) {
        setLastCorrectStage('subject');
        setStatus('feedback_correct');
        setShowFireworks(true);
        if (cashRegisterSound) {
          logToPage('LOG POINT 35: Playing cashRegisterSound for correct subject.');
          cashRegisterSound.currentTime = 0;
          cashRegisterSound.play().catch(error => logToPage(`LOG POINT 36: Error playing cashRegisterSound (subject): ${error.message}`));
        }
        setScore(s => s + 10);
        setIsScoreAnimating(true);
        setTimeout(() => setIsScoreAnimating(false), 300); 

        setSelectedIndices([]); 
        setTimeout(() => {
          setShowFireworks(false);
          if (allSentences.length > 0) { 
            logToPage('LOG POINT 36B: Correct subject, fetching new sentence.');
            fetchNewSentence(); 
          } else {
            logToPage('LOG POINT 36C: Correct subject, but allSentences is empty, cannot fetch new.');
          }
        }, 1500); 
      } else {
        setStatus('feedback_incorrect_subject');
        logToPage(`LOG POINT 37: Incorrect subject. errorSound object check: ${errorSound ? 'exists' : 'null'}`);
        if (errorSound && typeof errorSound.play === 'function') {
          logToPage(`LOG POINT 38: errorSound object exists for subject error. Attempting to play. Src: ${errorSound.src}`);
          errorSound.currentTime = 0;
          errorSound.play().catch(error => logToPage(`LOG POINT 39: Error playing error sound (subject): ${error.message}`));
        } else {
          logToPage('LOG POINT 40: errorSound is null or not valid for incorrect subject.');
        }
        setSelectedIndices([]); 
         setTimeout(() => {
          setStatus('asking_subject');
          logToPage('LOG POINT 40B: Returned to asking_subject after incorrect.');
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
    (questionText === mainQuestionVerb && (status === 'asking_verb' || (status === 'feedback_correct' && lastCorrectStage === 'subject'))) || // Apply when verb question is active OR when just completed subject (and new verb question appears)
    (questionText === mainQuestionSubject && status === 'asking_subject'); // Apply when subject question is active


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
                  if (status !== 'loading' && status !== 'initial_loading' && allSentences.length > 0) {
                    logToPage('LOG POINT 41: "Passer / Nouvelle phrase" button clicked.');
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

      <div style={{ position: 'fixed', bottom: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px', borderRadius: '5px', zIndex: 10000, fontSize: '10px', maxHeight: '50px', overflowY: 'auto' }}>
        DEBUG TEST VISIBLE?
      </div>

      {/* On-page debug area */}
      <div className="fixed bottom-0 left-0 w-full h-48 bg-gray-800 text-white p-2 overflow-y-scroll text-xs z-[9999]">
        <h3 className="text-sm font-bold mb-2">Debug Messages (Last 20):</h3>
        {debugMessages.map((msg, index) => (
          <p key={index} className="whitespace-pre-wrap break-all">{msg}</p>
        ))}
      </div>
    </div>
  );
}
