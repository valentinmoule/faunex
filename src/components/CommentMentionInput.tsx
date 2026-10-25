import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { activeMention, insertMention } from '@/lib/commentMentions';
import { Button } from '@/components/ui/button';
import { PremiumAvatar } from '@/components/PremiumAvatar';

type Explorer = { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null };

export default function CommentMentionInput({ value, onChange, onSubmit, placeholder, className }: {
  value: string; onChange: (value: string) => void; onSubmit: () => void; placeholder: string; className?: string;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(value.length);
  const [suggestions, setSuggestions] = useState<Explorer[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const mention = activeMention(value, cursor);
  const query = mention?.query ?? null;
  useEffect(() => {
    let cancelled = false;
    setSuggestions([]);
    if (query === null || !query || dismissed) return;
    const timer = setTimeout(async () => {
      // Only username-safe characters reach the pattern; escape wildcard underscores.
      const pattern = query.replace(/_/g, '\\_');
      const { data } = await supabase.from('profiles').select('user_id, username, display_name, avatar_url')
        .or([
          `username.ilike.@${pattern}%`,
          `username.ilike.${pattern}%`,
          `display_name.ilike.${pattern}%`,
        ].join(',')).limit(6);
      if (!cancelled) {
        // A user can match on both username and display name; keep one row per explorer.
        const seen = new Set<string>();
        setSuggestions((data ?? []).filter(e => (seen.has(e.user_id) ? false : (seen.add(e.user_id), true))));
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, dismissed]);
  return (
    <div className="relative flex-1 min-w-0">
      {suggestions.length > 0 && !dismissed && (
        <div role="listbox" aria-label={t('capture.detail.mentionExplorers')} className="absolute bottom-full mb-2 w-full max-h-48 overflow-y-auto bg-background border border-border rounded-lg z-10 divide-y divide-border">
          {suggestions.map(explorer => (
            <Button key={explorer.user_id} variant="ghost" role="option" aria-selected={false}
              className="w-full h-auto justify-start gap-2 rounded-none px-3 py-2"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                if (!mention || !explorer.username) return;
                const next = insertMention(value, mention, explorer.username);
                const nextCursor = mention.start + explorer.username.replace(/^@+/, '').length + 2;
                onChange(next); setCursor(nextCursor); setDismissed(true); setSuggestions([]);
                requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(nextCursor, nextCursor); });
              }}>
              <PremiumAvatar avatarUrl={explorer.avatar_url} name={explorer.display_name || explorer.username || ''} size="sm" />
              <span className="min-w-0 text-left"><span className="block truncate text-xs font-semibold">{explorer.display_name || explorer.username}</span><span className="block truncate text-xs text-muted-foreground">@{explorer.username?.replace(/^@+/, '')}</span></span>
            </Button>
          ))}
        </div>
      )}
      <input ref={input} type="text" value={value} placeholder={placeholder} aria-label={placeholder}
        className={className}
        onChange={e => { onChange(e.target.value); setCursor(e.target.selectionStart ?? e.target.value.length); setDismissed(false); }}
        onSelect={e => setCursor(e.currentTarget.selectionStart ?? value.length)}
        onKeyDown={e => {
          if (e.key === 'Escape') { setDismissed(true); setSuggestions([]); }
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit(); }
        }} />
    </div>
  );
}