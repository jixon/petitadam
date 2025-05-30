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
      size="lg" // Keep "lg" for consistent base padding from buttonVariants, then override
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-auto m-0.5 sm:m-1 rounded-md sm:rounded-lg shadow-sm sm:shadow-md transition-all duration-200 ease-in-out transform hover:scale-105',
        // Responsive text size
        'text-lg sm:text-xl md:text-2xl lg:text-3xl',
        // Responsive padding
        'px-3 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3',
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
