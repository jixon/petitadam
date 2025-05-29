
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
    const successAudio = new Audio('/sounds/cash-register.mp3');
    successAudio.preload = 'auto';
    setCashRegisterSound(successAudio);

    const failAudio = new Audio('/sounds/error-sound.mp3');
    failAudio.preload = 'auto';
    setErrorSound(failAudio);
    console.log('DEBUG: Error sound object initialized:', failAudio); // Vérification de l'initialisation

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
          console.warn("Sentences.json is empty or invalid, using fallback.");
          setAllSentences(fallbackSentences);
        }
      })
      .catch(error => {
        console.error("Failed to fetch sentences.json:", error);
        setAllSentences(fallbackSentences);
      });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }

    return () => {
      if (successAudio) {
        successAudio.pause();
      }
      if (failAudio) {
        failAudio.pause();
      }
    };
  }, []);

  const processPhrase = (phrase: string): string[] => {
    // Logique pour traiter "L'abeille" comme un seul mot
    // L'idée est de repérer "l'", "d'", "s'", "qu'" et de les joindre au mot suivant.
    const rawWords = phrase.split(' ');
    const processedWords: string[] = [];
    let i = 0;
    while (i < rawWords.length) {
      const currentWord = rawWords[i];
      // Regex pour les articles élidés communs et "qu'"
      if (/^(l'|d'|s'|qu')$/i.test(currentWord) && i + 1 < rawWords.length) {
        processedWords.push(currentWord + rawWords[i+1]);
        i += 2; // Avancer de deux mots (l'article + le nom)
      } else {
        processedWords.push(currentWord);
        i += 1;
      }
    }
    return processedWords;
  };


  const fetchNewSentence = useCallback(async () => {
    if (allSentences.length === 0) {
      // Cet état devrait être géré par le useEffect qui attend que allSentences soit chargé.
      // On ne fait rien ici si les phrases ne sont pas encore là.
      console.warn("fetchNewSentence called before allSentences were loaded. This should be handled by useEffect.");
      return;
    }

    setStatus('loading');
    setSelectedIndices([]);
    // Ne pas faire setSentence('') ici pour éviter des re-render inutiles et potentiels
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
      // S'il y a plus d'une phrase et qu'on a une phrase précédente, on essaie de ne pas la répéter
      if (allSentences.length > 1 && lastUsedSentenceIndex !== null) {
        availableSentences = allSentences.filter((_, index) => index !== lastUsedSentenceIndex);
        if (availableSentences.length === 0) { // Si on a filtré toutes les phrases (cas où il n'y en avait que 2 et on a utilisé les deux)
            availableSentences = allSentences; // On réutilise toutes les phrases
        }
      }

      const randomIndex = Math.floor(Math.random() * availableSentences.length);
      const selectedSentenceObject = availableSentences[randomIndex];

      // Trouver l'index original dans allSentences pour le stocker comme lastUsedSentenceIndex
      const originalIndex = allSentences.findIndex(s => s.phrase === selectedSentenceObject.phrase);
      setLastUsedSentenceIndex(originalIndex);

      const currentWords = processPhrase(selectedSentenceObject.phrase);
      const currentSubjectIndices = findPartIndices(currentWords, selectedSentenceObject.sujet);
      const currentVerbIndices = findPartIndices(currentWords, selectedSentenceObject.verbe);


      if (progressIntervalId) {
        clearInterval(progressIntervalId);
        progressIntervalId = undefined;
      }
      setLoadingProgressValue(100); // S'assurer que la barre est pleine

      setSentence(selectedSentenceObject.phrase); // Mettre à jour la phrase affichée
      setWords(currentWords); // Mettre à jour les mots pour l'affichage
      setCorrectSubjectIndices(currentSubjectIndices);
      setCorrectVerbIndices(currentVerbIndices);
      setCurrentQuestionAnimKey(prevKey => prevKey + 1); // Pour l'animation wavy text

      setTimeout(() => {
        setStatus('asking_verb');
      }, 300); // Petit délai pour voir la barre pleine

    } catch (error) {
      console.error("Failed to process sentence:", error);
      if (progressIntervalId) {
        clearInterval(progressIntervalId);
        progressIntervalId = undefined;
      }
      setLoadingProgressValue(100); // S'assurer que la barre est pleine

      // Utiliser une phrase de secours en cas d'erreur
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
  }, [allSentences, lastUsedSentenceIndex]); // Dépend de allSentences et lastUsedSentenceIndex

  // useEffect pour charger la première phrase une fois que allSentences est disponible
  useEffect(() => {
    if (allSentences.length > 0 && !initialSentenceLoaded) {
      fetchNewSentence();
      setInitialSentenceLoaded(true); // Marquer que la phrase initiale a été chargée
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
    // Cas spécial pour les phrases impératives où le sujet est implicite (indicesToCheck est vide)
    if (indicesToCheck.length === 0 && selectedIndices.length === 0) return true;
    const sortedSelected = [...selectedIndices].sort((a, b) => a - b);
    const sortedCorrect = [...indicesToCheck].sort((a, b) => a - b);
    return sortedSelected.every((val, index) => val === sortedCorrect[index]);
  };

  const triggerButtonAnimation = () => {
    if (!validateButtonRef.current) return;

    const buttonRect = validateButtonRef.current.getBoundingClientRect();
    const parentElement = validateButtonRef.current.parentElement;
    if (!parentElement) return; // Early exit if parent is not available
    const containerRect = parentElement.getBoundingClientRect();

    const startX = buttonRect.left - containerRect.left + buttonRect.width / 2;
    const startY = buttonRect.top - containerRect.top + buttonRect.height / 2;

    const newParticles: ButtonParticle[] = [];
    const numParticles = 12; // Nombre de particules pour l'animation du bouton
    for (let i = 0; i < numParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 40 + 25; // Distance de dispersion
      const particleSize = 6; // Taille des particules

      newParticles.push({
        id: Math.random(),
        style: {
          left: `${startX - particleSize / 2}px`,
          top: `${startY - particleSize / 2}px`,
          width: `${particleSize}px`,
          height: `${particleSize}px`,
          '--tx-btn': `${Math.cos(angle) * radius}px`,
          '--ty-btn': `${Math.sin(angle) * radius}px`,
          animationDelay: `${Math.random() * 0.2}s`, // Délai d'animation aléatoire
        } as React.CSSProperties, // Cast en React.CSSProperties pour inclure les variables CSS
      });
    }
    setButtonParticles(newParticles);
    setTimeout(() => setButtonParticles([]), 600); // Durée de l'animation des particules
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
        if (cashRegisterSound) {
          cashRegisterSound.currentTime = 0; // Rembobiner au début
          cashRegisterSound.play().catch(error => console.error("Error playing sound:", error));
        }
        setSelectedIndices([]); // Vider la sélection pour la prochaine étape
        setTimeout(() => {
          setShowFireworks(false);
          setStatus('asking_subject'); // Passer à la question du sujet
          setCurrentQuestionAnimKey(prevKey => prevKey + 1); // Pour l'animation wavy text
        }, 1500); // Durée des feux d'artifice
      } else {
        setStatus('feedback_incorrect_verb');
        console.log('DEBUG: Attempting to play error sound (verb):', errorSound); // LOG DE DÉBOGAGE
        if (errorSound) {
          errorSound.currentTime = 0;
          errorSound.play().catch(error => console.error("DEBUG: Error playing error sound (verb):", error));
        }
        setSelectedIndices([]); // Vider la sélection après une erreur
        setTimeout(() => {
          setStatus('asking_verb'); // Revenir à la question du verbe (même phrase)
          // Ne pas changer currentQuestionAnimKey ici pour ne pas relancer l'animation wavy
        }, 1500);
      }
    } else if (status === 'asking_subject') {
      isCorrect = checkAnswer(correctSubjectIndices);

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
        setTimeout(() => setIsScoreAnimating(false), 300); // Durée de l'animation du score

        setSelectedIndices([]); // Vider la sélection
        setTimeout(() => {
          setShowFireworks(false);
          if (allSentences.length > 0) { // S'assurer que les phrases sont chargées
            fetchNewSentence(); // Chercher une nouvelle phrase
          }
        }, 1500); // Durée des feux d'artifice
      } else {
        setStatus('feedback_incorrect_subject');
        console.log('DEBUG: Attempting to play error sound (subject):', errorSound); // LOG DE DÉBOGAGE
        if (errorSound) {
          errorSound.currentTime = 0;
          errorSound.play().catch(error => console.error("DEBUG: Error playing error sound (subject):", error));
        }
        setSelectedIndices([]); // Vider la sélection
         setTimeout(() => {
          setStatus('asking_subject'); // Revenir à la question du sujet (même phrase)
          // Ne pas changer currentQuestionAnimKey ici
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
    return "Petit Adam"; // Titre par défaut ou si aucun statut ne correspond
  };

  const isSentenceInteractive = status === 'asking_verb' || status === 'asking_subject';
  const isFeedbackIncorrect = status === 'feedback_incorrect_verb' || status === 'feedback_incorrect_subject';

  const questionText = getQuestionText();
  const mainQuestionVerb = "Quel est le verbe ?";
  const mainQuestionSubject = "Quel est le sujet ?";
  // L'animation Wavy ne se produit que si la question principale est affichée ET que le statut est 'asking_verb' ou 'asking_subject'
  // et que la currentQuestionAnimKey a changé.
  const shouldApplyWavyAnimation =
    (questionText === mainQuestionVerb && (status === 'asking_verb' || (status === 'feedback_correct' && lastCorrectStage === 'subject'))) ||
    (questionText === mainQuestionSubject && status === 'asking_subject');


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
                  
                  <h2 key={currentQuestionAnimKey}> {/* La clé est importante pour redémarrer l'animation wavy */}
                    {shouldApplyWavyAnimation
                      ? questionText.split('').map((char, index) => (
                          <span
                            key={`${char}-${index}`} // Clé unique pour chaque lettre
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
                  key={`${word}-${index}`} // Utiliser une clé qui change si le mot ou l'index change
                  word={word}
                  isSelected={selectedIndices.includes(index)}
                  onClick={() => handleWordClick(index)}
                  disabled={!isSentenceInteractive}
                />
              ))}
            </div>
          )}
           {(words.length === 0 && status !== 'loading' && status !== 'initial_loading') && (
             <div className="min-h-[100px] sm:min-h-[150px] mb-6 md:mb-8"> {/* Espace réservé si pas de mots */} </div>
           )}

          <div className="h-auto flex flex-col items-center justify-center">
            <div className="h-[76px] flex items-center justify-center relative w-full sm:w-auto"> {/* Conteneur pour le bouton et ses particules */}
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
             {/* Bouton "Passer / Nouvelle phrase" toujours visible sauf pendant le chargement ou feedback correct immédiat */}
             {(status === 'asking_verb' || status === 'asking_subject' || status === 'feedback_incorrect_verb' || status === 'feedback_incorrect_subject') && (
              <Button
                variant="link"
                className="mt-4 text-muted-foreground text-sm"
                onClick={() => {
                  // S'assurer que nous ne sommes pas en train de charger ou que allSentences est vide
                  if (status !== 'loading' && status !== 'initial_loading' && allSentences.length > 0) {
                    setSelectedIndices([]); // Réinitialiser la sélection
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

