import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play } from 'lucide-react';

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
  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:shadow-2xl border-gray-800 bg-gray-900/40"
      style={{ borderColor: primaryColor ? `${primaryColor}40` : undefined }}
    >
      <div className="relative aspect-video overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-gray-600">
            {title[0]}
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
5" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
            <span className="text-4xl opacity-60">{emoji}</span>
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
        <p className="text-sm text-gray-400 line-clamp-2 mb-4">{description}</p>
        <div className="flex items-center text-xs font-mono text-gray-500">
          Powered by <span className="ml-1 text-purple-400">${symbol}</span>
        </div>
      </CardContent>
    </Card>
  );
}
