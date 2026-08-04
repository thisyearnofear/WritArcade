import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Compass, Eye, Sword, Zap, Brain, Store, BookOpen, Play, TrendingUp, Clock, Clapperboard } from 'lucide-react';

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
  playCount?: number;
  lastPlayedAt?: string | null;
  hasAnimation?: boolean;
}

function formatLastPlayed(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function GameCard({ slug, title, description, genre, imageUrl, primaryColor, symbol, playCount, lastPlayedAt, hasAnimation }: GameCardProps) {
  const genreStyle = GENRE_STYLES[genre] || DEFAULT_STYLE;
  const GenreIcon = genreStyle.icon;
  const displaySymbol = symbol.startsWith('$') ? symbol : `$${symbol}`;

  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:shadow-2xl border-border bg-card"
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
        {hasAnimation && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-purple-600/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-sm">
            <Clapperboard className="h-3 w-3" />
            Animated
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Link href={`/games/${slug}`} className="bg-white text-black px-6 py-2 rounded-full font-bold flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform">
            <Eye className="w-4 h-4" /> View creation
          </Link>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Link href={`/games/${slug}`} className="min-w-0">
            <h3 className="text-lg font-bold text-card-foreground truncate hover:text-primary transition-colors">{title}</h3>
          </Link>
          <Badge variant="secondary" className="text-[10px]">{genre}</Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{description}</p>
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">
              Powered by <span className="text-primary">{displaySymbol}</span>
            </span>
            {lastPlayedAt && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground/60" title={`Last played: ${new Date(lastPlayedAt).toLocaleString()}`}>
                <Clock className="w-3 h-3" />
                {formatLastPlayed(lastPlayedAt)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {playCount !== undefined && playCount >= 5 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500">
                <TrendingUp className="w-3 h-3" />
                Trending
              </span>
            )}
            {playCount !== undefined && playCount > 0 && (
              <span className="flex items-center gap-1">
                <Play className="w-3 h-3" />
                <span>{playCount}</span>
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
