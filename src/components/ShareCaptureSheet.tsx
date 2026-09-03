import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer } from 'vaul';
import { Loader2, Link2, Download, Instagram, MessageCircle, Share2, Check } from 'lucide-react';
import type { AnimalCard } from '@/data/mockData';
import { buildShareImage, shareCaptureTo, shareLink, type ShareTarget } from '@/lib/shareCapture';
import { toast } from '@/hooks/use-toast';

interface Props {
  card: AnimalCard | null;
  open: boolean;
  onClose: () => void;
}

const targets: { id: ShareTarget; labelKey: string; icon: typeof Instagram; className: string }[] = [
  { id: 'stories', labelKey: 'capture.share.targets.stories', icon: Instagram, className: 'bg-gradient-to-br from-[hsl(330,85%,55%)] to-[hsl(35,95%,55%)] text-white' },
  { id: 'instagram', labelKey: 'capture.share.targets.instagram', icon: Instagram, className: 'bg-gradient-to-br from-[hsl(280,70%,55%)] to-[hsl(340,85%,55%)] text-white' },
  { id: 'facebook', labelKey: 'capture.share.targets.facebook', icon: Share2, className: 'bg-[hsl(221,60%,45%)] text-white' },
  { id: 'whatsapp', labelKey: 'capture.share.targets.whatsapp', icon: MessageCircle, className: 'bg-[hsl(142,60%,40%)] text-white' },
];

const ShareCaptureSheet = ({ card, open, onClose }: Props) => {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [pending, setPending] = useState<ShareTarget | null>(null);
  const [copied, setCopied] = useState(false);

  // Génère l'aperçu dès l'ouverture
  useEffect(() => {
    if (!open || !card?.image) return;
    let cancelled = false;
    let url: string | null = null;
    setPreviewUrl(null);
    setBlob(null);
    (async () => {
      try {
        const generated = await buildShareImage(card);
        if (cancelled) return;
        url = URL.createObjectURL(generated);
        setBlob(generated);
        setPreviewUrl(url);
      } catch (err) {
        console.error(err);
        if (!cancelled) toast({ title: t('capture.share.previewUnavailable'), description: t('capture.share.previewUnavailableDesc'), variant: 'destructive' });
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [open, card]);

  const handleTarget = useCallback(
    async (target: ShareTarget) => {
      if (!card) return;
      setPending(target);
      try {
        const result = await shareCaptureTo(card, target, blob ?? undefined);
        if (result === 'downloaded') {
          toast({
            title: t('capture.share.imageSaved'),
            description:
              target === 'stories' || target === 'instagram'
                ? t('capture.share.openInstagram')
                : t('capture.share.cardReady'),
          });
        }
        if (target === 'download' || result === 'shared') onClose();
      } catch (err) {
        console.error(err);
        toast({ title: t('capture.share.shareImpossible'), description: t('capture.detail.toastRetry'), variant: 'destructive' });
      } finally {
        setPending(null);
      }
    },
    [card, blob, onClose],
  );

  const handleCopyLink = useCallback(async () => {
    if (!card) return;
    try {
      await navigator.clipboard.writeText(shareLink(card));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: t('capture.share.linkCopied'), description: t('capture.share.pasteAnywhere') });
    } catch {
      toast({ title: t('capture.share.copyImpossible'), variant: 'destructive' });
    }
  }, [card]);

  if (!card) return null;

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[1400] bg-foreground/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[1401] max-h-[92vh] rounded-t-3xl bg-background pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none">
          <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-muted" />

          <div className="px-5 pt-4 space-y-5 overflow-y-auto">
            <div className="text-center">
              <h2 className="font-display text-lg font-bold">{t('capture.share.title')}</h2>
              <p className="text-xs text-muted-foreground">{card.name}</p>
            </div>

            {/* Aperçu */}
            <div className="mx-auto w-40 aspect-[4/5] rounded-2xl overflow-hidden bg-muted flex items-center justify-center shadow-lg">
              {previewUrl ? (
                <img src={previewUrl} alt={t('capture.share.previewAlt', { name: card.name })} className="w-full h-full object-cover" />
              ) : (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Cibles */}
            <div className="grid grid-cols-4 gap-3">
              {targets.map(({ id, labelKey, icon: Icon, className }) => (
                <button
                  key={id}
                  onClick={() => handleTarget(id)}
                  disabled={!previewUrl || pending !== null}
                  className="flex flex-col items-center gap-2 disabled:opacity-50"
                >
                  <span className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${className}`}>
                    {pending === id ? <Loader2 className="w-6 h-6 animate-spin" /> : <Icon className="w-6 h-6" />}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">{t(labelKey)}</span>
                </button>
              ))}
            </div>

            {/* Actions secondaires */}
            <div className="space-y-2">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                {copied ? <Check className="w-5 h-5 text-primary" /> : <Link2 className="w-5 h-5 text-muted-foreground" />}
                {t('capture.share.copyLink')}
              </button>
              <button
                onClick={() => handleTarget('download')}
                disabled={!previewUrl || pending !== null}
                className="w-full flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                <Download className="w-5 h-5 text-muted-foreground" />
                {t('capture.share.saveImage')}
              </button>
              <button
                onClick={() => handleTarget('system')}
                disabled={!previewUrl || pending !== null}
                className="w-full flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                <Share2 className="w-5 h-5 text-muted-foreground" />
                {t('capture.share.moreOptions')}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default ShareCaptureSheet;
