import { useState } from 'react';
import { Bell } from 'lucide-react';
import FeedPostCard from '@/components/FeedPostCard';
import CardDetailSheet from '@/components/CardDetailSheet';
import { mockFeed, mockCards } from '@/data/mockData';

const FeedPage = () => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const selectedCard = mockCards.find(c => c.id === selectedCardId) ?? null;

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-2xl font-display font-bold text-primary">Faunex</h1>
          <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          </button>
        </div>
      </header>


      {/* Feed */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {mockFeed.map(post => (
          <FeedPostCard
            key={post.id}
            post={post}
            onCardClick={setSelectedCardId}
          />
        ))}
      </div>

      <CardDetailSheet card={selectedCard} open={!!selectedCardId} onClose={() => setSelectedCardId(null)} />
    </main>
  );
};

export default FeedPage;
