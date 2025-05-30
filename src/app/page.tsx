
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const pathPrefix = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8 text-center select-none app-background-image">
      <header className="w-full flex justify-center items-center mb-6 md:mb-10">
        <Image
          src={`${pathPrefix}/images/petit-adam-logo.png`}
          alt="Petit Adam Logo"
          width={250}
          height={197}
          className="drop-shadow-md sm:w-[300px] md:w-[350px]"
          data-ai-hint="child drawing"
          priority
        />
      </header>

      <main className="w-full max-w-2xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-8 font-question text-karaoke-glow">
          Bienvenue à Petit Adam !
        </h1>
        <p className="text-lg sm:text-xl text-secondary-foreground mb-12">
          Choisis un jeu pour commencer à apprendre en t'amusant.
        </p>

        <div className="grid grid-cols-1 gap-6">
          <Link href={`${pathPrefix}/games/verb-subject-finder`} passHref>
            <Card className="hover:shadow-xl transition-shadow duration-300 cursor-pointer bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                   <Image
                    src={`${pathPrefix}/images/game-icon-verb-subject.png`}
                    alt="Icône du jeu Verbe et Sujet"
                    width={80}
                    height={80}
                    className="rounded-lg"
                    data-ai-hint="notebook pencil"
                  />
                </div>
                <CardTitle className="text-2xl font-semibold text-primary text-center font-question">
                  Trouve le Verbe et le Sujet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-card-foreground mb-6">
                  Identifie le verbe et le sujet dans les phrases pour aider Adam !
                </CardDescription>
                <div className="flex justify-center">
                    <Button size="lg" className="text-lg bg-primary hover:bg-primary/90 text-primary-foreground">
                        Jouer <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
          {/* Vous pourrez ajouter d'autres jeux ici à l'avenir */}
        </div>
      </main>

      <footer className="mt-auto pt-10">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Petit Adam. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
