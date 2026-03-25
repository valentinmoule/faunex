import { useState } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { type FeedPost, RARITY_LABELS } from '@/data/mockData';

interface Props {
  post: FeedPost;
  onCardClick: (cardId: string) => void;
}

const FeedPostCard = ({ post, onCardClick }: Props) => {
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const isShiny = post.animal.rarity === 'epic' || post.animal.rarity === 'mythic';
  const isMythic = post.animal.rarity === 'mythic';

  const handleLike = () => {
    setLiked(!liked);
    setLikes(prev => liked ? prev - 1 : prev + 1);
  };

  return (
    <article className="bg-card rounded-2xl border border-border overflow-hidden shadow-card">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary">
          {post.userName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-display font-semibold text-foreground truncate">{post.userName}</p>
          <p className="text-[11px] text-muted-foreground">{post.postedAt}</p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider bg-primary/10 text-primary">
          {RARITY_LABELS[post.animal.rarity]}
        </span>
      </div>

      {/* Image */}
      <button
        onClick={() => onCardClick(post.animal.id)}
        className={`relative w-full aspect-square overflow-hidden ${isMythic ? 'mythic-shiny' : ''}`}
      >
        <img src={post.animal.image} alt={post.animal.name} className="w-full h-full object-cover" />
        {isMythic && <div className="mythic-image-overlay" />}
        {isMythic && (
          <div className="mythic-sparkles">
            <span /><span /><span /><span /><span /><span />
          </div>
        )}
        {isShiny && !isMythic && <div className="absolute inset-0 holographic-card card-shimmer pointer-events-none" style={{ backgroundImage: 'var(--gradient-holographic)', backgroundSize: '200% 200%', opacity: 0.2 }} />}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-foreground/60 to-transparent p-4 pt-12">
          <p className="text-primary-foreground font-display font-bold text-lg">{post.animal.name}</p>
          <p className="text-primary-foreground/70 text-xs italic">{post.animal.scientificName}</p>
        </div>
      </button>

      {/* Caption */}
      <div className="px-4 pt-3">
        <p className="text-sm text-foreground leading-relaxed">{post.caption}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-5 px-4 py-3">
        <button onClick={handleLike} className="flex items-center gap-1.5 group">
          <Heart className={`w-5 h-5 transition-colors ${liked ? 'fill-destructive text-destructive' : 'text-muted-foreground group-hover:text-destructive'}`} />
          <span className="text-sm text-muted-foreground">{likes}</span>
        </button>
        <button className="flex items-center gap-1.5 group">
          <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-sm text-muted-foreground">{post.comments}</span>
        </button>
        <button className="ml-auto group">
          <Share2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </div>
    </article>
  );
};

export default FeedPostCard;
