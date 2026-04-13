import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Compass, Sword, Zap, Brain, Store, BookOpen } from 'lucide-react';

const GENRE_STYLES: Record<string, { gradient: string; icon: React.ElementType }> = {
  Adventure:  { gradient: 'from-emerald-800 via-teal-900 to-cyan-950', icon: Compass },
  Action:     { gradient: 'from-red-800 via-orange-900 to-amber-950', icon: Sword },
  Strategy:   { gradient: 'from-blue-800 via-indigo-900 to-violet-950', icon: Zap },
  Puzzle:     { gradient: 'from-violet-800 via-purple-900 to-fuchsia-950', icon: Brain },
  Simulation: { gradient: 'from-amber-800 via-yellow-900 to-lime-950', icon: Store },
};
const DEFAULT_STYLE = { gradient: 'from-slate-700 via-gray-800 to-slate-900', icon: BookOpen };

interface GameCardProps {
  slug: string;
  title: string;
  description: string;
  genre: string;
  imageUrl?: string | null;
  primaryColor?: string | null;
  symbol: string;
}

export function GameCard({ slug, title, description, genre, imageUrl, primaryColor, symbol }: GameCardProps) {
  const genreStyle = GENRE_STYLES[genre] || DEFAULT_STYLE;
  const GenreIcon = genreStyle.icon;

  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:shadow-2xl border-gray-800 bg-gray-900/40"
      style={{ borderColor: primaryColor ? `${primaryColor}40` : undefined }}
    >
      <div className="relative aspect-video overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${genreStyle.gradient} flex flex-col items-center justify-center gap-2`}>
            <GenreIcon className="w-10 h-10 text-white/30" />
            <span className="text-xs font-semibold uppercase tracking-widest text-white/25">{genre || 'Game'}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Link href={`/games/${slug}`} className="bg-white text-black px-6 py-2 rounded-full font-bold flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform">
            <Play className="w-4 h-4 fill-current" /> Play Now
          </Link>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-white truncate">{title}</h3>
          <Badge variant="secondary" className="text-[10px]">{genre}</Badge>
        </div>
        <p className="text-sm text-gray-300 line-clamp-2 mb-4">{description}</p>
        <div className="flex items-center text-xs font-mono text-gray-500">
          Powered by <span className="ml-1 text-purple-400">${symbol}</span>
        </div>
      </CardContent>
    </Card>
  );
}
