import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Bookmark, Check, Crown, FolderPlus, Plus, X } from 'lucide-react';
import { hapticTap } from '@/lib/haptics';
import type { CustomCollection } from '@/hooks/useCustomCollections';

interface Props {
  open: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  collections: CustomCollection[];
  /** Ids des collections contenant déjà cette espèce. */
  memberOf: Set<string>;
  onToggleCollection: (collectionId: string) => void;
  onCreateCollection: (name: string) => Promise<boolean>;
  isPremium: boolean;
  onGoPremium: () => void;
}

/**
 * Fenêtre « Ajouter » de la fiche espèce : favoris, collections
 * personnalisées (Premium) ou création d'une nouvelle collection.
 */
const AddToCollectionSheet = ({
  open,
  onClose,
  isFavorite,
  onToggleFavorite,
  collections,
  memberOf,
  onToggleCollection,
  onCreateCollection,
  isPremium,
  onGoPremium,
}: Props) => {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const target = document.querySelector('[role="dialog"]') || document.body;

  const close = () => {
    setCreating(false);
    setName('');
    onClose();
  };

  const submitCreate = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const ok = await onCreateCollection(name);
    setSaving(false);
    if (ok) {
      setCreating(false);
      setName('');
    }
  };

  return createPortal(
    <div className="absolute inset-0 z-50 flex items-end justify-center">
      <button
        aria-label={t('bestiary.common.close')}
        onClick={close}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-lg rounded-t-3xl bg-card border-t border-border p-4 pb-8 space-y-1 animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between px-1 pb-2">
          <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wide">
            {t('bestiary.customCollections.addTitle')}
          </h3>
          <button onClick={close} aria-label={t('bestiary.common.close')} className="p-1.5 rounded-full hover:bg-muted transition">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Favoris */}
        <button
          onClick={() => {
            hapticTap();
            onToggleFavorite();
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/60 active:scale-[0.99] transition text-left"
        >
          <Bookmark className={`w-5 h-5 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
          <span className="flex-1 text-sm font-display font-semibold text-foreground">
            {t('bestiary.customCollections.favorites')}
          </span>
          {isFavorite && <Check className="w-4 h-4 text-primary" />}
        </button>

        {/* Collections existantes */}
        {collections.length > 0 && (
          <div className="pt-2">
            <p className="px-3 pb-1 text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">
              {t('bestiary.customCollections.myCollections')}
            </p>
            {collections.map((c) => {
              const inside = memberOf.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    hapticTap();
                    onToggleCollection(c.id);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/60 active:scale-[0.99] transition text-left"
                >
                  <FolderPlus className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 min-w-0 truncate text-sm font-display font-semibold text-foreground">{c.name}</span>
                  {inside && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Création */}
        <div className="pt-2">
          {creating ? (
            <div className="flex items-center gap-2 px-1">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitCreate();
                }}
                placeholder={t('bestiary.customCollections.namePlaceholder')}
                maxLength={40}
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-muted/60 border border-border text-sm font-display placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={() => void submitCreate()}
                disabled={!name.trim() || saving}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display font-bold disabled:opacity-40 active:scale-95 transition"
              >
                {t('bestiary.customCollections.create')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                hapticTap();
                if (!isPremium) {
                  onGoPremium();
                  return;
                }
                setCreating(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/60 active:scale-[0.99] transition text-left"
            >
              <Plus className="w-5 h-5 text-primary" />
              <span className="flex-1 text-sm font-display font-semibold text-primary">
                {t('bestiary.customCollections.createNew')}
              </span>
              {!isPremium && <Crown className="w-4 h-4 text-amber" />}
            </button>
          )}
        </div>
      </div>
    </div>,
    target as Element,
  );
};

export default AddToCollectionSheet;
