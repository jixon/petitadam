// @/components/game/WordChip.tsx
"use client";

import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WordChipProps {
  word: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
}

export const WordChip: FC<WordChipProps> = ({
  word,
  isSelected,
  onClick,
  disabled = false,
  isCorrect,
  isIncorrect,
}) => {
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'text-2xl md:text-3xl lg:text-4xl h-auto px-4 py-3 m-1 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105',
        isSelected && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
        !isSelected && 'bg-card hover:bg-secondary',
        isCorrect && 'bg-accent text-accent-foreground animate-pulse',
        isIncorrect && 'bg-destructive text-destructive-foreground',
        disabled && 'opacity-70 cursor-not-allowed'
      )}
      aria-pressed={isSelected}
    >
      {word}
    </Button>
  );
};
