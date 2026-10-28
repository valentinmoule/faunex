import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';
import { Crop, Sparkles } from 'lucide-react';
import { Drawer } from 'vaul';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

interface Props {
  photo: string;
  onCancel: () => void;
  onDone: (cropped: string, area: Area) => void;
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Exporte la zone choisie en JPEG (même qualité que les captures, max 1024 px). */
export async function cropDataUrl(src: string, area: Area): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, 1024 / Math.max(area.width, area.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('CANVAS_UNAVAILABLE');
  context.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

export default function CropPhotoDialog({ photo, onCancel, onDone }: Props) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { isPremium, loading } = useSubscription(session?.user?.id);
  const navigate = useNavigate();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const confirm = async () => {
    if (!isPremium || loading || !area) return;
    setBusy(true);
    try {
      onDone(await cropDataUrl(photo, area), area);
    } finally {
      setBusy(false);
    }
  };

  // Vaul locks the page (body pointer-events/overflow); an abrupt unmount can leave it locked.
  useEffect(() => () => {
    setTimeout(() => {
      document.body.style.pointerEvents = '';
      document.body.style.removeProperty('pointer-events');
    }, 0);
  }, []);

  // While Premium status loads, don't mount the upsell drawer: swapping it out for the cropper froze the screen.
  if (loading && !isPremium) return null;

  if (!isPremium) {
    return (
      <Drawer.Root open onOpenChange={(open) => { if (!open) onCancel(); }}>
        <Drawer.Portal container={document.querySelector<HTMLElement>('[role="dialog"]:not([data-crop])') ?? document.body}>
          <Drawer.Overlay className="fixed inset-0 z-[200] bg-foreground/50" />
          <Drawer.Content data-crop className="fixed inset-x-0 bottom-0 z-[201] rounded-t-3xl bg-background px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 outline-none">
            <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-muted-foreground/25" />
            <div className="mx-auto max-w-sm text-center">
              <Crop className="mx-auto mb-4 h-12 w-12 text-primary" />
              <Drawer.Title className="font-display text-xl font-bold">{t('capture.crop.premiumTitle')}</Drawer.Title>
              <Drawer.Description className="mt-2 text-sm text-muted-foreground">{t('capture.crop.premiumDescription')}</Drawer.Description>
              {loading ? <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-primary" aria-label={t('capture.actions.saving')} /> : (
                <Button className="mt-6 h-12 w-full" onClick={() => { onCancel(); navigate('/premium'); }}>
                  <Sparkles className="h-4 w-4" />{t('capture.explorerPhotos.premiumCta')}
                </Button>
              )}
              <Button variant="ghost" className="mt-2 w-full" onClick={onCancel}>{t('capture.crop.cancel')}</Button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-foreground" role="dialog" data-crop aria-label={t('capture.crop.title')}>
      <div className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-3">
        <button onClick={onCancel} className="p-2 rounded-full text-background" aria-label={t('capture.crop.cancel')}>
          <X className="w-6 h-6" />
        </button>
        <p className="font-display font-bold text-background">{t('capture.crop.title')}</p>
        <span className="w-10" />
      </div>
      <div className="relative flex-1">
        <Cropper
          image={photo}
          crop={crop}
          zoom={zoom}
          aspect={4 / 5}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onComplete}
          objectFit="contain"
        />
      </div>
      <div className="px-5 pt-4 pb-[max(22px,calc(env(safe-area-inset-bottom)+16px))] space-y-4">
        <input
          type="range" min={1} max={4} step={0.01} value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-primary"
          aria-label={t('capture.crop.zoom')}
        />
        <button
          onClick={confirm}
          disabled={!area || busy}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-primary text-primary-foreground font-display text-sm font-semibold disabled:opacity-50"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('capture.crop.apply')}
        </button>
      </div>
    </div>,
    document.querySelector<HTMLElement>('[role="dialog"]:not([data-crop])') ?? document.body,
  );
}
