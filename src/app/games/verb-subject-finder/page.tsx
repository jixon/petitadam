
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WordChip } from '@/components/game/WordChip';
import { FireworksAnimation } from '@/components/animations/FireworksAnimation';
import { Progress } from "@/components/ui/progress";
import { Brain, MessageCircleQuestion, Loader2, RefreshCw, SparklesIcon as SparklesLucide, Info, XCircle, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";

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

const pathPrefix = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function VerbSubjectFinderPage() {
  const [hasMounted, setHasMounted] = useState(false);

  const [sentence, setSentence] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [correctVerbIndices, setCorrectVerbIndices] = useState<number[]>([]);
  const [correctSubjectIndices, setCorrectSubjectIndices] = useState<number[]>([]);

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  
  const [verbsFoundCount, setVerbsFoundCount] = useState(0);
  const [subjectsFoundCount, setSubjectsFoundCount] = useState(0);
  const [verbErrorsCount, setVerbErrorsCount] = useState(0);
  const [subjectErrorsCount, setSubjectErrorsCount] = useState(0);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);

  const [status, setStatus] = useState<GameStatus>('initial_loading');
  const [showFireworks, setShowFireworks] = useState(false);

  const [loadingProgressValue, setLoadingProgressValue] = useState(0);
  const [isScoreAnimating, setIsScoreAnimating] = useState(false);
  const [lastCorrectStage, setLastCorrectStage] = useState<'verb' | 'subject' | null>(null);
  const [buttonParticles, setButtonParticles] = useState<ButtonParticle[]>([]);
  const validateButtonRef = useRef<HTMLButtonElement>(null);
  const [currentQuestionAnimKey, setCurrentQuestionAnimKey] = useState(0);
  
  const [goodAnswerSound, setGoodAnswerSound] = useState<HTMLAudioElement | null>(null);
  const [cashRegisterSound, setCashRegisterSound] = useState<HTMLAudioElement | null>(null);
  const [errorSound, setErrorSound] = useState<HTMLAudioElement | null>(null);

  const [allSentences, setAllSentences] = useState<SentenceData[]>([]);
  const [lastUsedSentenceIndex, setLastUsedSentenceIndex] = useState<number | null>(null);
  const [initialSentenceLoaded, setInitialSentenceLoaded] = useState(false);
  const [sentenceLoadingError, setSentenceLoadingError] = useState<string | null>(null);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  const playSound = useCallback((type: 'good-answer' | 'cash-register' | 'error') => {
    let audioToPlay: HTMLAudioElement | null = null;

    if (type === 'good-answer') {
      if (!goodAnswerSound) {
        try {
          const newAudio = new Audio(`${pathPrefix}/sounds/good-answer.mp3`); 
          newAudio.preload = 'auto';
          setGoodAnswerSound(newAudio);
          audioToPlay = newAudio;
        } catch (e) {
          console.error(`Error CREATING good-answer sound:`, e);
          return;
        }
      } else {
        audioToPlay = goodAnswerSound;
      }
    } else if (type === 'cash-register') {
      if (!cashRegisterSound) {
        try {
          const newAudio = new Audio(`${pathPrefix}/sounds/cash-register.mp3`); 
          newAudio.preload = 'auto';
          setCashRegisterSound(newAudio);
          audioToPlay = newAudio;
        } catch (e) {
          console.error(`Error CREATING cash-register sound:`, e);
          return;
        }
      } else {
        audioToPlay = cashRegisterSound;
      }
    } else if (type === 'error') {
      if (!errorSound) {
        try {
          const newAudio = new Audio(`${pathPrefix}/sounds/error-sound.mp3`); 
          newAudio.preload = 'auto';
          setErrorSound(newAudio);
          audioToPlay = newAudio;
        } catch (e) {
          console.error(`Error CREATING error sound:`, e);
          return;
        }
      } else {
        audioToPlay = errorSound;
      }
    }

    if (audioToPlay) {
      audioToPlay.currentTime = 0;
      audioToPlay.play().catch(e => console.error(`Error playing ${type} sound:`, e));
    }
  }, [goodAnswerSound, cashRegisterSound, errorSound, setGoodAnswerSound, setCashRegisterSound, setErrorSound]);


  useEffect(() => {
    setStatus('initial_loading');
    setLoadingProgressValue(0);
    setSentenceLoadingError(null);
    
    fetch(`${pathPrefix}/data/sentences.json`) 
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
          setSentenceLoadingError("Aucune phrase n'a pu être chargée. Utilisation des phrases de secours.");
          setAllSentences(fallbackSentences);
        }
      })
      .catch(error => {
        console.error(`Failed to fetch sentences.json: ${error.message}`, error);
        setSentenceLoadingError(`Erreur de chargement des phrases : ${error.message}. Utilisation des phrases de secours.`);
        setAllSentences(fallbackSentences);
      });

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${pathPrefix}/sw.js`).then(registration => { 
          // console.log(`SW registered: `, registration);
        }).catch(registrationError => {
          console.error(`SW registration failed: `, registrationError);
        });
      });
    }
  }, []); 

  const processPhrase = (phrase: string): string[] => {
    const wordsArray = phrase.match(/[ldsqjntm]'|(?:[\p{L}\p{N}-]['’]?)+[.,!?;:]*|\S/gu) || [];
    
    const processedWords: string[] = [];
    let i = 0;
    while (i < wordsArray.length) {
        const currentWord = wordsArray[i];
        if (/^(l'|d'|s'|qu')$/i.test(currentWord) && 
            i + 1 < wordsArray.length && 
            wordsArray[i+1].length > 0 && 
            /^\p{L}/u.test(wordsArray[i+1].charAt(0))) { 
            processedWords.push(currentWord + wordsArray[i+1]);
            i += 2;
        } 
        else if (currentWord.toLowerCase() === "n'" && 
                 i + 1 < wordsArray.length && 
                 /^(est|ai|as|a|avons|avez|ont|étais|était|étions|étiez|étaient|suis|es|sommes|êtes|sont)/i.test(wordsArray[i+1])) {
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
      setSentenceLoadingError(`Erreur lors de la préparation de la phrase: ${error.message}. Utilisation d'une phrase de secours.`);

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
        setVerbsFoundCount(prev => prev + 1);
        setLastCorrectStage('verb');
        setStatus('feedback_correct');
        setShowFireworks(true);
        playSound('good-answer');
        setSelectedIndices([]); 
        setTimeout(() => {
          setShowFireworks(false);
          setStatus('asking_subject'); 
          setCurrentQuestionAnimKey(prevKey => prevKey + 1); 
        }, 1500); 
      } else {
        setVerbErrorsCount(prev => prev + 1);
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
        setSubjectsFoundCount(prev => prev + 1);
        setLastCorrectStage('subject');
        setStatus('feedback_correct');
        setShowFireworks(true);
        playSound('cash-register');
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
        setSubjectErrorsCount(prev => prev + 1);
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

  if (!hasMounted) {
    return (
      <div className="flex flex-col items-center justify-start min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8 text-center select-none app-background-image">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground">Chargement du jeu...</p>
      </div>
    );
  }

  const isSentenceInteractive = status === 'asking_verb' || status === 'asking_subject';
  const isFeedbackIncorrect = status === 'feedback_incorrect_verb' || status === 'feedback_incorrect_subject';

  const questionText = getQuestionText();
  const mainQuestionVerb = "Quel est le verbe ?";
  const mainQuestionSubject = "Quel est le sujet ?";

  const shouldApplyWavyAnimation =
    (questionText === mainQuestionVerb && (status === 'asking_verb' || (status === 'feedback_correct' && lastCorrectStage === 'subject'))) || 
    (questionText === mainQuestionSubject && status === 'asking_subject'); 


  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8 text-center select-none app-background-image">
      {showFireworks && <FireworksAnimation />}
      
      <header className="w-full flex justify-between items-center mb-6 md:mb-10">
        <Link href={`${pathPrefix}/`} passHref>
           <Image
            src={`${pathPrefix}/images/petit-adam-logo.png`} 
            alt="Petit Adam Logo"
            width={150} 
            height={118} 
            className="drop-shadow-md sm:w-[180px] md:w-[200px] cursor-pointer" 
            data-ai-hint="child drawing"
            priority
          />
        </Link>
        <div className="flex items-center">
            <Link href={`${pathPrefix}/`} passHref>
                <Button variant="ghost" size="icon" aria-label="Retour à l'accueil" className="ml-2 sm:ml-4">
                    <Home className="h-5 w-5 sm:h-6 sm:h-6" />
                </Button>
            </Link>
        </div>
      </header>

      <Card className="w-full max-w-3xl shadow-2xl rounded-xl transition-all duration-300 relative">
        <Button
            variant="outline"
            onClick={() => setIsStatsDialogOpen(true)}
            className={cn(
            "absolute -top-3 right-3 sm:-top-4 sm:right-4 z-10 flex items-center bg-card text-card-foreground px-3 py-4 sm:px-4 sm:py-5 md:px-5 md:py-7 rounded-lg shadow-lg", 
            "transition-transform duration-300 ease-in-out hover:scale-105",
            "hover:bg-card hover:text-card-foreground", 
            isScoreAnimating && "scale-110"
            )}
        >
            <Image
            src={`${pathPrefix}/images/coin.png`} 
            alt="Points"
            width={28}
            height={28}
            className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
            data-ai-hint="coin money"
            />
            <span className="ml-1 sm:ml-2 mr-2 sm:mr-3 text-xl sm:text-2xl md:text-3xl font-bold text-amber-500">{score}</span>
        </Button>

        <CardContent className="p-4 sm:p-6 md:p-10">
          <div className="mb-4 sm:mb-6 md:mb-8 min-h-[60px] sm:min-h-[80px] md:min-h-[100px] flex flex-col items-center justify-center">
            { (status === 'loading' || status === 'initial_loading') && !sentenceLoadingError ? (
              <div className="flex flex-col items-center justify-center text-center gap-2 sm:gap-3 w-full">
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary animate-spin" />
                <p className="text-base sm:text-lg text-muted-foreground mt-2">{questionText}</p>
                <Progress value={loadingProgressValue} className="w-3/4 max-w-xs mt-2" />
              </div>
            ) : sentenceLoadingError ? (
              <div className="flex flex-col items-center justify-center text-center gap-2 sm:gap-3 w-full text-destructive">
                <XCircle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />
                <p className="text-base sm:text-lg mt-2">{sentenceLoadingError}</p>
                <p className="text-xs text-muted-foreground">Le jeu utilisera des phrases de secours.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mb-1 sm:mb-2 text-secondary-foreground">
                  { (status === 'asking_verb' || status === 'asking_subject') && <Brain className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 mr-2 sm:mr-3 text-primary" /> }
                  { isFeedbackIncorrect && <MessageCircleQuestion className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 mr-2 sm:mr-3 text-destructive" /> }
                  { status === 'feedback_correct' && !showFireworks && <SparklesLucide className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 mr-2 sm:mr-3 text-accent" /> }
                  
                  <h2 key={currentQuestionAnimKey} className="font-question"> 
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
           {(words.length === 0 && status !== 'loading' && status !== 'initial_loading' && !sentenceLoadingError) && (
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
                  disabled={selectedIndices.length === 0}
                  className="w-full sm:w-auto text-xl sm:text-2xl md:text-3xl px-8 py-4 sm:px-10 sm:py-5 md:px-12 md:py-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200"
                >
                  Valider
                </Button>
              )}
            </div>
            {(status === 'asking_verb' || status === 'asking_subject' || status === 'feedback_incorrect_verb' || status === 'feedback_incorrect_subject') && (
              <>
                <div className="flex items-center mt-4 text-xs sm:text-sm text-muted-foreground">
                  <Info className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Appuyer sur un ou plusieurs mots pour les sélectionner.</span>
                </div>
                <Button
                  variant="link"
                  className="mt-3 sm:mt-4 text-muted-foreground text-xs sm:text-sm"
                  onClick={() => {
                     if (allSentences.length > 0) {
                        setSelectedIndices([]); 
                        fetchNewSentence();
                    }
                  }}
                  disabled={allSentences.length === 0}
                >
                  <RefreshCw className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Passer / Nouvelle phrase
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent 
           className="w-[95vw] max-h-[85vh] overflow-y-auto top-4 translate-y-0 data-[state=closed]:slide-out-to-top-[calc(env(safe-area-inset-top)_+_1rem)] data-[state=open]:slide-in-from-top-[calc(env(safe-area-inset-top)_+_1rem)] sm:max-w-md sm:top-[50%] sm:translate-y-[-50%] sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-top-[48%]"
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">Statistiques du Jeu</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Voici votre performance jusqu'à présent.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 items-center gap-4">
              <p className="text-right font-medium">Verbes trouvés:</p>
              <p className="text-left text-lg font-semibold text-green-600">{verbsFoundCount}</p>
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <p className="text-right font-medium">Sujets trouvés:</p>
              <p className="text-left text-lg font-semibold text-green-600">{subjectsFoundCount}</p>
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <p className="text-right font-medium">Erreurs (Verbe):</p>
              <p className="text-left text-lg font-semibold text-red-600">{verbErrorsCount}</p>
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <p className="text-right font-medium">Erreurs (Sujet):</p>
              <p className="text-left text-lg font-semibold text-red-600">{subjectErrorsCount}</p>
            </div>
             <hr className="my-2"/>
            <div className="grid grid-cols-2 items-center gap-4">
              <p className="text-right font-medium">Total Erreurs:</p>
              <p className="text-left text-lg font-semibold text-red-600">{verbErrorsCount + subjectErrorsCount}</p>
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <p className="text-right font-medium">Phrases Réussies:</p>
              <p className="text-left text-lg font-semibold text-primary">{subjectsFoundCount}</p>
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <p className="text-right font-medium">Score Total:</p>
              <p className="text-left text-lg font-semibold text-primary">{score}</p>
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Fermer
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

