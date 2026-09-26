import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Camera, Zap, MapPin, SwitchCamera, X, Loader2, Plus, RefreshCw, PenLine, ZoomIn, Focus, Crosshair, ArrowLeft, Clock, Info, Sparkles, ShieldQuestion, Users, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { setPendingShelve } from '@/lib/shelveAnimation';
import { prepareSourceImage, prepareSourceFile } from '@/lib/imageProcessing';
import { isHeicFile, readExifCameraInfo, exifDateToIso } from '@/lib/exif';
import { IS_NATIVE_APP } from '@/lib/platform';
import { pickNativeGalleryPhoto } from '@/lib/nativeGallery';
import { useCamera } from '@/hooks/useCamera';
import { useGeoTag } from '@/hooks/useGeoTag';
import { useAnimalIdentification, type RejectionKind } from '@/hooks/useAnimalIdentification';
import { useCaptureSave } from '@/hooks/useCaptureSave';
import { useCaptureReveal } from '@/hooks/useCaptureReveal';
import RevealStage from '@/components/capture/RevealStage';
import { useSpeciesFinders } from '@/hooks/useSpeciesFinders';
import RarityBadge from '@/components/RarityBadge';
import HolographicCard from '@/components/HolographicCard';
import { normalizeRarity } from '@/data/mockData';
import { useCaptureQuota, DAILY_CAPTURE_LIMIT } from '@/hooks/useCaptureQuota';
import { useSubscription } from '@/hooks/useSubscription';

import type { AnimalResult } from '@/types/capture';
import { isPlaceholderName, cleanScientificName } from '@/lib/placeholderNames';

/** Rangée d'information de l'écran de résultat — même design que la fiche espèce (DetailRow). */
const ResultInfoRow = ({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) => (
  <div className="flex items-start gap-3 px-4 py-3">
    <span className="mt-0.5 text-muted-foreground">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground/85 leading-snug mt-0.5">{value}</p>
    </div>
  </div>
);


const CapturePage = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [animalResult, setAnimalResult] = useState<AnimalResult | null>(null);
  const [saved, setSaved] = useState(false);
  /** Invitation Premium affichée après la dernière identification du jour. */
  const [premiumPrompt, setPremiumPrompt] = useState(false);
  /** Verrou synchrone contre les doubles taps sur « Ajouter ». */
  const savingRef = useRef(false);
/** Verrou synchrone contre deux analyses IA simultanées. */
  const identifyingRef = useRef(false);
  /** Effet « prise de photo » : le déclencheur holographique pulse ~700 ms. */
  const [capturing, setCapturing] = useState(false);
  const captureTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (captureTimerRef.current) window.clearTimeout(captureTimerRef.current);
  }, []);


  const [duplicateCapture, setDuplicateCapture] = useState<{ id: string; image_url: string; animal_name: string } | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
const [manualMode, setManualMode] = useState(false);
  /** Repli taxonomique honnête renvoyé par le serveur (genre / famille). */
  const [taxonHint, setTaxonHint] = useState<string | null>(null);
  /** true quand l'import galerie n'a pas de signature d'appareil (EXIF) :
   *  la photo part en vérification humaine, sans analyse IA. */
  const [exifFlagged, setExifFlagged] = useState(false);
  /** Date de prise de vue lue dans les EXIF d'une photo importée. */
  const [photoTakenAt, setPhotoTakenAt] = useState<string | null>(null);
  /** Non-null quand l'utilisateur contexte l'identification IA et demande une vérification humaine. */
  const [disputedResult, setDisputedResult] = useState<AnimalResult | null>(null);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  /** Refus explicite de l'IA (représentation, image d'internet, humain) : l'utilisateur
   *  peut malgré tout demander une vérification humaine. */
  const [rejectedImage, setRejectedImage] = useState<{ kind: RejectionKind; title: string; message: string } | null>(null);


  const [manualName, setManualName] = useState('');
  const [manualSpecies, setManualSpecies] = useState('');
  const [manualDescription, setManualDescription] = useState('');


  const camera = useCamera({ paused: !!capturedPhoto });
  const geo = useGeoTag();
  const { identifying, stage: identifyStage, identify } = useAnimalIdentification();
  /** Compteur de secondes pour rassurer l'utilisateur pendant l'analyse. */
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!identifying) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const t = window.setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [identifying]);

const quota = useCaptureQuota(session?.user?.id);

  /** Accroche aléatoire, re-tirée à chaque ouverture de la caméra. */
  const motivation = useMemo(() => {
    const messages = t('capture.motivations', { returnObjects: true }) as string[];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [t]);

  const { revealPhase, revealRarity, revealAnimal, triggerReveal, reset: resetReveal, skip: skipReveal } =
    useCaptureReveal(setAnimalResult);
  /* Popularité de l'espèce identifiée : combien de naturalistes l'ont déjà capturée. */
  const speciesFinders = useSpeciesFinders(animalResult?.animal_name, !!animalResult);
  const { saving, findDuplicate, insertCapture, replaceCapture, submitManualEntry } = useCaptureSave({
    userId: session?.user?.id,
    photo: capturedPhoto,
    geo: { coords: geo.coords, name: geo.name },
    takenAt: photoTakenAt,
  });

  /** Premium : plafond de sécurité (200 analyses / jour) et non la limite gratuite de 4. */
  const { isPremium } = useSubscription(session?.user?.id);
  const quotaMessage = isPremium
    ? t('capture.quota.premiumCapToast')
    : t('capture.quota.limitReached', { limit: DAILY_CAPTURE_LIMIT });


  const {
    videoRef, canvasRef, cameraActive, facingMode, switchCamera,
    flash, setFlash, zoomLevel, maxZoom, supportsNativeZoom, applyZoom,
    focusMode, focusPoint, focusAnimating, toggleFocusMode,
    handleTouchStart, handleTouchMove, handleTouchEnd, handleTapToFocus,
    grabFrame, resumePreview,
  } = camera;

  /** Shared pipeline for both the camera shot and the gallery import.
   *  `exifWarning` signale une photo importée sans signature d'appareil : elle
   *  est tout de même analysée par l'IA, le message n'est affiché que si
   *  l'identification n'aboutit pas (repli en saisie manuelle).
   *  `exifCoords` : coordonnées GPS lues dans les EXIF d'une photo importée ;
   *  elles priment alors sur la position actuelle de l'appareil. */
  const processPhoto = useCallback(async (
    rawDataUrl: string,
    exifWarning?: string,
    exifCoords?: { lat: number; lng: number } | null,
    exifTakenAt?: string | null,
  ) => {
    // The daily slot is only consumed when the capture is added to the Faunex.
    if (quota.exhausted) {
      toast.error(quotaMessage);
      return;
    }
    // Une analyse déjà en cours ne doit pas être écrasée par une seconde.
    if (identifyingRef.current) return;
    identifyingRef.current = true;

    // Toute photo est normalisée (max 1600px / JPEG 0.82) avant d'être affichée,
    // analysée ou envoyée au stockage : évite les uploads interminables et les
    // pics mémoire sur les imports galerie très lourds (12 Mpx / 15 Mo).
    const dataUrl = await prepareSourceImage(rawDataUrl);
    if (!dataUrl) {
      identifyingRef.current = false;
      toast.error(t('capture.errors.imageUnreadable'));
      return;
    }
    setCapturedPhoto(dataUrl);
    setPhotoTakenAt(exifTakenAt ?? null);

setAnimalResult(null);
    setSaved(false);
    setIdentifyError(null);
    setRejectedImage(null);
    setManualMode(false);
    setTaxonHint(null);
    setExifFlagged(false);
    setDisputedResult(null);
    // Photo importée avec GPS EXIF : on géolocalise la capture à l'endroit
    // où la photo a réellement été prise, sinon position actuelle.
    if (exifCoords) {
      void geo.apply(exifCoords);
    } else {
      geo.capture();
    }

// Photo importée sans signature d'appareil : l'analyse IA a quand même lieu.
    // Le message n'est utilisé qu'en repli, si l'espèce n'est pas reconnue.
    if (exifWarning) setExifFlagged(true);

    try {
      const outcome = await identify(dataUrl);

      if (outcome.status === 'identified') {
        triggerReveal(outcome.animal);
      } else if (outcome.status === 'error') {
        setIdentifyError(outcome.message);
      } else if (outcome.status === 'rejected') {
        setRejectedImage({ kind: outcome.kind, title: outcome.title, message: outcome.message });

      } else {
        setTaxonHint(outcome.hint ?? exifWarning ?? null);
        setManualMode(true);
      }
    } finally {
      identifyingRef.current = false;
      // Le compteur affiché suit exactement les analyses réellement débitées.
      void quota.refresh();
    }
  }, [geo, identify, triggerReveal, quota, t]);

  /** Relance l'analyse IA sur la photo déjà prise (sans reprendre la photo). */
  const retryIdentify = useCallback(async () => {
    if (!capturedPhoto || identifyingRef.current) return;
    identifyingRef.current = true;
    setIdentifyError(null);
    setRejectedImage(null);
    try {
      const outcome = await identify(capturedPhoto);
      if (outcome.status === 'identified') {
        triggerReveal(outcome.animal);
      } else if (outcome.status === 'error') {
        setIdentifyError(outcome.message);
      } else if (outcome.status === 'rejected') {
        setRejectedImage({ kind: outcome.kind, title: outcome.title, message: outcome.message });

      } else {
        setTaxonHint(outcome.hint ?? null);
        setManualMode(true);
      }
    } finally {
      identifyingRef.current = false;
      void quota.refresh();
    }
  }, [capturedPhoto, identify, triggerReveal, quota]);





const takePhoto = async () => {
    // Un appui pendant une analyse en cours ne doit rien déclencher.
    if (identifyingRef.current) return;
    setCapturing(true);
    if (captureTimerRef.current) window.clearTimeout(captureTimerRef.current);
    captureTimerRef.current = window.setTimeout(() => setCapturing(false), 700);
    // Le flux vidéo peut ne pas encore avoir décodé d'image (démarrage caméra,
    // retour d'arrière-plan). On patiente au lieu d'obliger l'utilisateur à
    // appuyer plusieurs fois sur le déclencheur.
    let dataUrl: string | null = null;
    for (let attempt = 0; attempt < 8 && !dataUrl; attempt++) {
      dataUrl = grabFrame();
      if (!dataUrl) await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!dataUrl) {
      toast.error(t('capture.errors.cameraReset'));
      return;
    }
    await processPhoto(dataUrl);
  };


  /** Import galerie : le même pipeline que la photo caméra (normalisation,
   *  conversion HEIC iPhone, analyse IA). Un simple <input type="file"> est
   *  utilisé : il fonctionne aussi bien en web app que dans les WebViews
   *  Capacitor iOS/Android, sans plugin natif supplémentaire.
   *
   *  Les EXIF sont lus pour la géolocalisation et comme simple indice : une
   *  photo sans signature d'appareil (messageries qui effacent les EXIF) est
   *  quand même identifiée par l'IA, le message d'explication ne sert qu'en
   *  repli si l'espèce n'est pas reconnue. */
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  /** Ouvre le sélecteur natif dans l'app installée (photos iCloud téléchargées
   *  automatiquement), et le sélecteur de fichiers du navigateur sinon. */
  const openGalleryPicker = async () => {
    if (IS_NATIVE_APP) {
      try {
        const picked = await pickNativeGalleryPhoto();
        if (!picked) return;
        const reason = picked.looksLikeCameraPhoto === false
          ? t('capture.exif.suspiciousReason')
          : undefined;
        await processPhoto(picked.dataUrl, reason, picked.gps, picked.takenAt ?? null);
        return;
      } catch (err) {
        console.error(err);
        toast.error(t('capture.errors.galleryUnreadable'));
        return;
      }
    }
    galleryInputRef.current?.click();
  };

  const importFromGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permet de réimporter deux fois de suite le même fichier.
    e.target.value = '';
    if (!file) return;
    // Photo iCloud pas encore téléchargée sur l'appareil : le fichier arrive vide.
    if (file.size === 0) {
      toast.error(t('capture.errors.galleryNotDownloaded'));
      return;
    }
    try {
      // La lecture EXIF est un simple indice : elle ne doit jamais faire
      // échouer l'import (fichiers volumineux, métadonnées exotiques…).
      let exif: Awaited<ReturnType<typeof readExifCameraInfo>> | null = null;
      if (!isHeicFile(file)) {
        try {
          exif = await readExifCameraInfo(file);
        } catch {
          exif = null;
        }
      }
      const suspicious = exif !== null && !exif.looksLikeCameraPhoto;
      const reason = suspicious
        ? t('capture.exif.suspiciousReason')
        : undefined;
      const prepared = await prepareSourceFile(file);
      if (!prepared) {
        toast.error(t('capture.errors.galleryUnreadable'));
        return;
      }
      await processPhoto(prepared, reason, exif?.gps ?? null, exifDateToIso(exif?.dateTimeOriginal));
    } catch (err) {
      console.error(err);
      toast.error(t('capture.errors.galleryUnreadable'));
    }


  };






  const resetCapture = () => {
    setCapturedPhoto(null);
    setAnimalResult(null);
    setSaved(false);
    setDuplicateCapture(null);
setManualMode(false);
    setDisputedResult(null);
    setIdentifyError(null);
    setRejectedImage(null);
    setTaxonHint(null);
    setExifFlagged(false);


    setManualName('');
    setManualSpecies('');
    setManualDescription('');
    geo.reset();
    resetReveal();
    resumePreview();
  };

  const isDailyLimitError = (err: unknown) =>
    JSON.stringify((err as any)?.message ?? err ?? '').includes('DAILY_CAPTURE_LIMIT_REACHED');

  /** Consumes a daily slot right before persisting a capture. */
  const consumeSlot = async () => {
    const allowed = await quota.consume();
    if (!allowed) {
      toast.error(quotaMessage);
    }
    return allowed;
  };

  /** L'utilisateur estime que l'identification IA est fausse : bascule sur le formulaire de vérification. */
  const requestVerification = () => {
    if (!animalResult) return;
    setDisputedResult(animalResult);
    setManualName('');
    setManualSpecies('');
    setManualDescription('');
    setAnimalResult(null);
    resetReveal();
    setManualMode(true);
  };

  const saveManualEntry = async () => {
    const trimmedName = manualName.trim();
    const trimmedSpecies = cleanScientificName(manualSpecies) || '';
    const trimmedDesc = manualDescription.trim();
    if (!trimmedName || !trimmedDesc) {
      toast.error(t('capture.errors.fillNameAndDescription'));
      return;
    }
    if (isPlaceholderName(trimmedName)) {
      toast.error(t('capture.errors.invalidName'));
      return;
    }
    // L'espèce est peut-être déjà dans le Faunex de l'utilisateur (ou déjà en
    // attente de modération) : inutile d'envoyer un doublon aux modérateurs.
    const alreadyOwned = await findDuplicate(trimmedName, trimmedSpecies || null);
    if (alreadyOwned) {
      toast.error(t('capture.errors.alreadyHaveSpecies', { name: alreadyOwned.animal_name }));
      return;
    }


    // Toute demande de modération (vérification d'une identification IA comme
    // soumission d'un animal non reconnu) consomme un slot quotidien : elle
    // aboutit à une capture ajoutée au Faunex après validation.
    if (!(await consumeSlot())) return;
    let consumed = true;
    try {
      // Le modérateur doit voir ce que l'IA proposait pour arbitrer.
      const aiNote = disputedResult
        ? t('capture.manual.aiNote', {
            name: disputedResult.animal_name,
            scientific: disputedResult.scientific_name ? t('capture.manual.aiNoteScientific', { scientific: disputedResult.scientific_name }) : '',
            confidence: typeof disputedResult.confidence === 'number' ? t('capture.manual.aiNoteConfidence', { confidence: disputedResult.confidence }) : '',
          })
        : '';
      const ok = await submitManualEntry({
        name: trimmedName,
        species: trimmedSpecies,
        description: `${trimmedDesc}${aiNote}`,
      });
      if (!ok) {
        // Rien n'a été enregistré : le slot débité est rendu.
        if (consumed) await quota.refund();
        return;
      }
      setSaved(true);
      toast.success(
        disputedResult
          ? t('capture.toasts.verificationRequested')
          : t('capture.toasts.submittedForValidation')
      );
      leaveAfterCapture(1500);
    } catch (err) {
      console.error(err);
      if (consumed) await quota.refund();
      if (String((err as { message?: string })?.message ?? err).includes('SESSION_EXPIRED')) {
        toast.error(t('capture.errors.sessionExpired'));
        return;
      }
      toast.error(isDailyLimitError(err) ? quotaMessage : t('capture.errors.submissionError'));
    }
  };


  /**
   * Sortie de l'écran capture. Si c'était la dernière identification du jour,
   * on affiche d'abord l'invitation Premium (tous les parcours : IA validée,
   * soumission manuelle, demande de vérification).
   */
  const leaveAfterCapture = (delay: number) => {
    window.setTimeout(async () => {
      const left = await quota.fetchRemaining();
      if (!isPremium && left !== null && left <= 0) {
        setPremiumPrompt(true);
        return;
      }
      // Le bestiaire (grille des cartes) vit désormais sur /bestiaire : on y va
      // directement pour que l'animation de rangement de la carte s'y joue.
      navigate('/bestiaire');
    }, delay);
  };

  const finishSave = (animal: AnimalResult, imageUrl: string, message?: string) => {
    setSaved(true);
    setDuplicateCapture(null);
    if (message) toast.success(message);
    setPendingShelve({
      animalName: animal.animal_name,
      scientificName: animal.scientific_name ?? null,
      category: animal.category,
      rarity: animal.rarity,
      imageUrl,
    });
    leaveAfterCapture(900);
  };


  const saveToCollection = async () => {
    if (!animalResult) return;
    // Verrou synchrone : plusieurs taps rapides déclenchaient autant d'insertions.
    if (savingRef.current) return;
    savingRef.current = true;
    let consumed = false;
    try {
      const existing = await findDuplicate(animalResult.animal_name, animalResult.scientific_name);
      if (existing) {
        setDuplicateCapture(existing);
        return;
      }
      if (!(await consumeSlot())) return;
      consumed = true;
      const imageUrl = await insertCapture(animalResult);
      if (!imageUrl) {
        // Upload ou insertion refusée : on rend le slot.
        await quota.refund();
        consumed = false;
        return;
      }
      consumed = false;
      finishSave(animalResult, imageUrl);
    } catch (err) {
      console.error(err);
      if (consumed) await quota.refund();
      const msg = String((err as { message?: string })?.message ?? err);
      if (msg.includes('SESSION_EXPIRED')) {
        toast.error(t('capture.errors.sessionExpired'));
        return;
      }
      if (msg.includes('unique_species_per_user') || msg.includes('duplicate key')) {
        // Sécurité serveur : l'espèce existe déjà sous un autre nom commun.
        toast.error(t('capture.errors.alreadyHaveSpecies', { name: animalResult.scientific_name ?? animalResult.animal_name }));
        return;
      }
      toast.error(isDailyLimitError(err) ? quotaMessage : t('capture.errors.saveError'));
    } finally {
      savingRef.current = false;
    }

  };


  const doReplaceExisting = async () => {
    if (!animalResult || !duplicateCapture) return;
    if (savingRef.current) return;
    savingRef.current = true;
    let consumed = false;
    try {
      if (!(await consumeSlot())) return;
      consumed = true;
      const imageUrl = await replaceCapture(animalResult, duplicateCapture.id);
      if (!imageUrl) {
        await quota.refund();
        consumed = false;
        return;
      }
      consumed = false;
      finishSave(animalResult, imageUrl, t('capture.toasts.updatedInFaunex', { name: animalResult.animal_name }));
    } catch (err) {
      console.error(err);
      if (consumed) await quota.refund();
      toast.error(t('capture.errors.updateError'));
    } finally {
      savingRef.current = false;
    }
  };




  const keepExisting = () => {
    setDuplicateCapture(null);
    toast.info(t('capture.errors.existingPhotoKept'));
    resetCapture();
  };

  const geoName = geo.name;


  return (
    <main className={`min-h-screen bg-foreground flex flex-col ${animalResult && revealPhase === 'done' ? '' : 'pb-24'}`}>
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,.heic,.heif,.dng,.tif,.tiff"
        className="hidden"
        onChange={importFromGallery}
      />
      

      

      {/* Camera / photo / result */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Camera or captured photo background */}
        <div
          className="absolute inset-0 touch-none"

          onTouchStart={!capturedPhoto ? handleTouchStart : undefined}
          onTouchMove={!capturedPhoto ? handleTouchMove : undefined}
          onTouchEnd={!capturedPhoto ? handleTouchEnd : undefined}
          onClick={!capturedPhoto ? handleTapToFocus : undefined}
        >
          {/* Video is always mounted so the stream stays attached when retaking a photo */}
          <video
            ref={videoRef}
            autoPlay playsInline muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${capturedPhoto ? 'invisible' : ''}`}
            style={!supportsNativeZoom && zoomLevel > 1 && !capturedPhoto ? { transform: `${facingMode === 'user' ? 'scaleX(-1) ' : ''}scale(${zoomLevel})`, transformOrigin: 'center center' } : undefined}
          />
          {capturedPhoto && (
            <img src={capturedPhoto} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {!capturedPhoto && !cameraActive && (
            <div className="absolute inset-0 bg-foreground flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-12 h-12 text-primary-foreground/70 mx-auto mb-3" />
                <p className="text-primary-foreground/70 text-sm font-display">{t('capture.camera.activating')}</p>
              </div>
            </div>
          )}

          {/* Focus point indicator */}
          {focusPoint && (
            <div
              className={`absolute pointer-events-none z-30 transition-all duration-300 ${focusAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
              style={{ left: focusPoint.x - 28, top: focusPoint.y - 28 }}
            >
              <div className="w-14 h-14 border-2 border-amber rounded-lg flex items-center justify-center">
                <Crosshair className="w-5 h-5 text-amber" />
              </div>
            </div>
          )}
        </div>

        {/* Overlay gradient for readability */}
        {(animalResult || identifying || manualMode || identifyError || rejectedImage || revealPhase === 'charging') && (
          <div className={`absolute inset-0 transition-opacity duration-300 ${
            revealPhase === 'charging' ? 'bg-black/60' :
            'bg-gradient-to-t from-foreground via-foreground/70 to-transparent'
          }`} />
        )}

        {/* Zoom indicator + slider */}
        {!capturedPhoto && cameraActive && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 bg-foreground/60 backdrop-blur-sm rounded-full px-4 py-2">
              <ZoomIn className="w-4 h-4 text-primary-foreground/70" />
              <input
                type="range"
                min={1}
                max={maxZoom}
                step={0.1}
                value={zoomLevel}
                onChange={(e) => applyZoom(parseFloat(e.target.value))}
                className="w-32 h-1 accent-primary cursor-pointer"
              />
              <span className="text-primary-foreground text-xs font-display min-w-[2.5rem] text-center">{zoomLevel.toFixed(1)}x</span>
            </div>
          </div>
        )}

        {/* Viewfinder (only when camera live) */}
        {!capturedPhoto && cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-72 border-2 border-primary-foreground/30 rounded-3xl">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-2xl -translate-x-px -translate-y-px" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-2xl translate-x-px -translate-y-px" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-2xl -translate-x-px translate-y-px" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-2xl translate-x-px translate-y-px" />
            </div>
          </div>
        )}

        {/* Top controls */}
        <div className="relative z-20 flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="p-3 rounded-full bg-primary-foreground/10 text-primary-foreground/70"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {!capturedPhoto && (
              <>
                <button
                  onClick={() => setFlash(!flash)}
                  className={`p-3 rounded-full transition-colors ${flash ? 'bg-amber text-amber-dark' : 'bg-primary-foreground/10 text-primary-foreground/70'}`}
                >
                  <Zap className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleFocusMode}
                  className={`p-3 rounded-full transition-colors ${focusMode === 'manual' ? 'bg-amber text-amber-dark' : 'bg-primary-foreground/10 text-primary-foreground/70'}`}
                >
                  <Focus className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {quota.remaining !== null && !quota.unlimited && (
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${quota.exhausted ? 'bg-destructive/25' : 'bg-primary-foreground/10'}`}>
                <Camera className={`w-3.5 h-3.5 ${quota.exhausted ? 'text-destructive' : 'text-primary'}`} />
                <span className="text-primary-foreground/80 text-xs font-display">
                  {quota.remaining}/{DAILY_CAPTURE_LIMIT}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-full px-3 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary-foreground/70 text-xs font-display">{geoName || t('capture.quota.locationPlaceholder')}</span>
            </div>
          </div>

        </div>

        {/* Quota exhausted banner — above the camera viewfinder */}
        {!capturedPhoto && quota.exhausted && (
          <div className="relative z-20 mx-6 mt-4">
            <div className="rounded-2xl border border-amber/30 bg-amber/15 backdrop-blur-md p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-amber/25 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-light" />
                </div>
                <div>
                  <p className="text-primary-foreground font-display font-bold text-sm">
                    {isPremium ? t('capture.quota.premiumCapTitle') : t('capture.quota.bannerTitle')}
                  </p>
                  <p className="text-primary-foreground/80 text-xs mt-1 leading-relaxed">
                    {isPremium ? t('capture.quota.premiumCapBody') : t('capture.quota.bannerBody')}
                  </p>
                  {!isPremium && (
                    <button
                      onClick={() => navigate('/premium')}
                      className="mt-2 rounded-full bg-primary-foreground/90 px-3 py-1.5 text-xs font-display font-semibold text-primary"
                    >
                      {t('capture.quota.premiumCta')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Result overlay */}
        {identifying && (
          <div className="relative z-20 flex-1 flex items-center justify-center px-8">
            <div className="text-center max-w-xs">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
              <p className="text-primary-foreground font-display text-sm">
                {identifyStage === 'compressing'
                  ? t('capture.identify.preparing')
                  : identifyStage === 'retrying'
                    ? t('capture.identify.retrying')
                    : t('capture.identify.analyzing')}
              </p>
              <p className="text-primary-foreground/60 text-xs mt-2">
                {elapsed < 6
                  ? t('capture.identify.hintShort')
                  : elapsed < 15
                    ? t('capture.identify.hintMedium', { elapsed })
                    : t('capture.identify.hintLong', { elapsed })}
              </p>
            </div>
          </div>
        )}


        <RevealStage
          phase={revealPhase}
          rarity={revealRarity}
          animal={revealAnimal}
          photo={capturedPhoto}
          onSkip={skipReveal}
        />

        {animalResult && !identifying && revealPhase === 'done' && (
          <div className="relative z-20 flex-1 flex flex-col justify-end min-h-0">
            {/* Feuille claire — même design que le corps de la fiche espèce */}
            <div className="bg-background rounded-t-3xl px-5 pt-5 pb-5 space-y-4 animate-fade-in max-h-[88dvh] overflow-y-auto shadow-[0_-10px_30px_hsl(var(--foreground)/0.3)]">
              {/* Carte holographique — même rendu que la fiche espèce */}
              {capturedPhoto && (
                <HolographicCard
                  rarity={normalizeRarity(animalResult.rarity)}
                  containInteraction
                  className="relative mx-auto max-w-[220px] aspect-[4/5] rounded-[1.75rem]"
                  style={{ ['--holo-radius' as any]: '1.75rem' }}
                >
                  <div className={`relative w-full h-full rounded-[1.75rem] overflow-hidden holo-frame holo-frame--${normalizeRarity(animalResult.rarity).replace(/_/g, '-')}`}>
                    <div className="absolute top-[14px] right-[14px] z-20 pointer-events-none">
                      <RarityBadge rarity={animalResult.rarity} plain />
                    </div>
                    <div className="relative w-full h-full rounded-[1.25rem] overflow-hidden">
                      <img src={capturedPhoto} alt={animalResult.animal_name} className="w-full h-full object-cover pointer-events-none select-none" draggable={false} />
                    </div>
                  </div>
                </HolographicCard>
              )}
              {/* Nom + nom scientifique */}
              <div className="text-center">
                <h2 className="text-2xl font-display font-bold text-foreground">{animalResult.animal_name}</h2>
                <p className="text-muted-foreground text-sm italic">{animalResult.scientific_name}</p>
                {animalResult.alternatives && animalResult.alternatives.length > 0 && typeof animalResult.confidence === 'number' && animalResult.confidence < 80 && (
                  <p className="text-muted-foreground text-[11px] font-display mt-1.5">
                    {t('capture.alsoPossible', { alternatives: animalResult.alternatives.slice(0, 3).join(' · ') })}
                  </p>
                )}
              </div>

              {/* Description — texte simple centré, comme la fiche espèce (sans boîte) */}
              <p className="text-sm text-foreground/80 leading-relaxed text-center max-w-sm mx-auto">{animalResult.description}</p>

              {/* Infos — liste épurée façon iOS, lignes séparées comme la fiche espèce */}
              <div className="rounded-2xl border border-border bg-card divide-y divide-border/60">
                <ResultInfoRow
                  icon={<Sparkles className="w-4 h-4" />}
                  label={t('capture.detail.rarityLabel')}
                  value={<RarityBadge rarity={animalResult.rarity} plain showLabel className="detail-rarity-line" />}
                />
                {typeof animalResult.confidence === 'number' && (
                  <ResultInfoRow
                    icon={<Info className="w-4 h-4" />}
                    label={t('capture.result.confidenceLabel')}
                    value={t('capture.confidence.sure', { confidence: animalResult.confidence })}
                  />
                )}
                {speciesFinders !== undefined && (
                  <ResultInfoRow
                    icon={<Users className="w-4 h-4" />}
                    label={t('capture.detail.capturedByLabel')}
                    value={t('capture.finders.people', { count: speciesFinders })}
                  />
                )}
              </div>

              {/* Doublon : l'espèce est déjà dans le Faunex — proposer le remplacement
                  directement dans la feuille (photos cliquables pour les voir en grand). */}
              {duplicateCapture ? (
                <div className="space-y-3 pt-1">
                  <p className="text-foreground font-display font-semibold text-sm text-center">
                    {t('capture.duplicate.warning', { name: duplicateCapture.animal_name })}
                  </p>
                  <div className="flex gap-3 items-center justify-center">
                    <button type="button" onClick={() => setFullscreenPhoto(duplicateCapture.image_url)} className="text-center">
                      <p className="text-[10px] text-muted-foreground font-display mb-1">{t('capture.duplicate.current')}</p>
                      <img src={duplicateCapture.image_url} alt="" className="w-24 h-24 rounded-xl object-cover border border-border" />
                    </button>
                    <div className="text-muted-foreground text-lg">→</div>
                    <button type="button" onClick={() => capturedPhoto && setFullscreenPhoto(capturedPhoto)} className="text-center">
                      <p className="text-[10px] text-muted-foreground font-display mb-1">{t('capture.duplicate.newPhoto')}</p>
                      {capturedPhoto && <img src={capturedPhoto} alt="" className="w-24 h-24 rounded-xl object-cover border-2 border-primary" />}
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    <button
                      onClick={doReplaceExisting}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-primary text-primary-foreground font-display text-sm font-semibold disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      {t('capture.duplicate.replacePhoto')}
                    </button>
                    <button
                      onClick={keepExisting}
                      className="w-full py-3.5 rounded-full font-display text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t('capture.duplicate.keepCurrent')}
                    </button>
                  </div>
                </div>
              ) : (
              /* Actions empilées : « Ajouter » en premier */
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={saveToCollection}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-primary text-primary-foreground font-display text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? t('capture.actions.saving') : t('capture.actions.add')}
                </button>
                <button
                  onClick={resetCapture}
                  className="w-full py-3.5 rounded-full font-display text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('capture.actions.dontAdd')}
                </button>
              </div>
              )}

              {/* Contester l'identification — simple lien souligné */}
              <button
                onClick={requestVerification}
                className="mx-auto flex items-center gap-1 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                {t('capture.requestVerification')}
              </button>
            </div>
          </div>
        )}

        {/* Technical failure (network / AI) — not a real "unknown animal" */}
        {identifyError && !identifying && !animalResult && (
          <div className="relative z-20 flex-1 flex flex-col justify-end px-5 pb-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-amber" />
                <h2 className="text-lg font-display font-bold text-primary-foreground">{t('capture.technicalFailure.title')}</h2>
              </div>
              <p className="text-primary-foreground/90 text-sm">{identifyError}</p>
              <div className="flex gap-3">
                <button
                  onClick={retryIdentify}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> {t('capture.technicalFailure.retry')}
                </button>
                <button
                  onClick={() => { setIdentifyError(null); setManualMode(true); }}
                  className="flex-1 py-3 rounded-xl bg-primary-foreground/10 text-primary-foreground font-display font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <PenLine className="w-4 h-4" /> {t('capture.technicalFailure.manualEntry')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refus explicite (représentation d'animal, image issue d'internet, humain).
            L'utilisateur peut tout de même demander une vérification humaine. */}
        {rejectedImage && !manualMode && !identifying && !animalResult && (
          <div className="relative z-20 flex-1 flex flex-col justify-end px-5 pb-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldQuestion className="w-5 h-5 text-amber" />
                <h2 className="text-lg font-display font-bold text-primary-foreground">{rejectedImage.title}</h2>
              </div>
              <p className="text-primary-foreground/90 text-sm leading-relaxed">{rejectedImage.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={resetCapture}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> {t('capture.rejected.resumeCapture')}
                </button>
                <button
                  onClick={() => setManualMode(true)}
                  className="flex-1 py-3 rounded-xl bg-primary-foreground/10 text-primary-foreground font-display font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <ShieldQuestion className="w-4 h-4" /> {t('capture.rejected.requestCheck')}
                </button>
              </div>
              <p className="text-primary-foreground/60 text-[11px] text-center">
                {t('capture.rejected.hint')}
              </p>
            </div>
          </div>
        )}



        {/* Manual entry form when AI can't identify */}

        {manualMode && !identifying && !animalResult && (
          <div className="relative z-20 flex-1 flex flex-col justify-end px-5 pb-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
{exifFlagged ? (
                  <Info className="w-5 h-5 text-amber" />
                ) : disputedResult || rejectedImage ? (
                  <ShieldQuestion className="w-5 h-5 text-amber" />
                ) : (
                  <PenLine className="w-5 h-5 text-amber" />
                )}
                <h2 className="text-lg font-display font-bold text-primary-foreground">
                  {exifFlagged
                    ? t('capture.manual.humanVerification')
                    : disputedResult || rejectedImage
                      ? t('capture.manual.requestVerificationTitle')
                      : t('capture.manual.unrecognizedAnimal')}
                </h2>
              </div>
              {disputedResult && (
                <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-2">
                  <p className="text-[10px] font-display uppercase tracking-wide text-primary-foreground/60">
                    {t('capture.manual.aiProposal')}
                  </p>
                  <p className="text-sm text-primary-foreground/90 font-display">
                    {typeof disputedResult.confidence === 'number'
                      ? t('capture.manual.aiProposalConfidence', { name: disputedResult.animal_name, confidence: disputedResult.confidence })
                      : disputedResult.animal_name}
                  </p>
                </div>
              )}
              {!disputedResult && rejectedImage && (
                <div className="rounded-xl border border-amber/30 bg-amber/10 px-3 py-2">
                  <p className="text-[10px] font-display uppercase tracking-wide text-primary-foreground/60">
                    {t('capture.manual.aiRejection')}
                  </p>
                  <p className="text-sm text-primary-foreground/90">{rejectedImage.title}</p>
                </div>
              )}
{!disputedResult && !rejectedImage && taxonHint && (
                <div className="rounded-xl border border-amber/30 bg-amber/10 px-3 py-2.5">
                  {exifFlagged && (
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-display font-semibold uppercase tracking-wide text-amber">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {t('capture.manual.whyModeration')}
                    </p>
                  )}
                  <p className="text-sm text-primary-foreground/90">{taxonHint}</p>
                </div>
              )}
              <p className="text-primary-foreground/90 text-sm">
                {disputedResult
                  ? t('capture.manual.descDisputed')
                  : rejectedImage
                    ? t('capture.manual.descRejected')
                    : t('capture.manual.descDefault')}
              </p>


              <input
                type="text"
                placeholder={t('capture.manual.namePlaceholder')}
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 bg-primary-foreground/10 rounded-xl text-sm text-primary-foreground placeholder:text-primary-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
              />
              <input
                type="text"
                placeholder={t('capture.manual.speciesPlaceholder')}
                value={manualSpecies}
                onChange={e => setManualSpecies(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 bg-primary-foreground/10 rounded-xl text-sm text-primary-foreground placeholder:text-primary-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body italic"
              />
              <textarea
                placeholder={t('capture.manual.descriptionPlaceholder')}
                value={manualDescription}
                onChange={e => setManualDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2.5 bg-primary-foreground/10 rounded-xl text-sm text-primary-foreground placeholder:text-primary-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body resize-none"
              />
              <p className="text-primary-foreground/70 text-[10px] text-right">{t('capture.manual.charCount', { count: manualDescription.length })}</p>
            </div>
          </div>
        )}
      </div>

      {/* Visionneuse plein écran pour comparer l'ancienne et la nouvelle photo */}
      {fullscreenPhoto && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-foreground/95 flex items-center justify-center p-4"
          onClick={() => setFullscreenPhoto(null)}
        >
          <button
            type="button"
            aria-label={t('common.close', { defaultValue: 'Fermer' })}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center"
            onClick={() => setFullscreenPhoto(null)}
          >
            <X className="w-5 h-5 text-primary-foreground" />
          </button>
          <img src={fullscreenPhoto} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>,
        document.body,
      )}

      {/* Bottom controls — masqués quand la feuille de résultat est affichée */}
      {!(animalResult && !identifying && revealPhase === 'done') && (
      <div className="relative z-10 flex items-center justify-center gap-6 py-6 px-6">
        {saved ? (
          <button onClick={resetCapture} className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-display text-sm">
            <Camera className="w-4 h-4" />
            {t('capture.actions.newCapture')}
          </button>
        ) : duplicateCapture ? null : manualMode ? (
          <button
            onClick={saveManualEntry}
            disabled={saving || !manualName.trim() || !manualDescription.trim()}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-amber text-foreground font-display text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : disputedResult ? <ShieldQuestion className="w-4 h-4" /> : <PenLine className="w-4 h-4" />}
            {saving ? t('capture.actions.sending') : disputedResult ? t('capture.actions.requestVerificationBtn') : t('capture.actions.submitForValidation')}
          </button>
        ) : identifying ? null : capturedPhoto ? null : (
          <>
            {/* Import depuis la bibliothèque photo (web app + apps natives). */}
            <button
              onClick={openGalleryPicker}
              disabled={quota.exhausted}
              aria-label={t('capture.camera.importFromGallery')}
              className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center disabled:opacity-40"
            >
              <ImageIcon className="w-5 h-5 text-primary-foreground/70" />
            </button>


            <div className="flex flex-col items-center gap-2">
<button
                onClick={takePhoto}
                disabled={quota.exhausted}
                aria-label={quota.exhausted ? t('capture.quota.quotaLabel') : t('capture.camera.takePhoto')}
                className={`shutter-holo w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${capturing ? 'shutter-capturing' : ''}`}
              >
                <span className="shutter-ripple" aria-hidden />
                <span className="shutter-ripple" aria-hidden />
                <span className="shutter-holo-ring" aria-hidden />
                <span className="shutter-inner relative w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                  <Camera className="w-7 h-7 text-primary-foreground relative z-10" />
                </span>
              </button>
{quota.remaining !== null && !quota.exhausted && (
                <p className="text-primary-foreground/85 text-xs font-display text-center max-w-[230px] leading-snug italic">
                  {motivation}
                </p>
              )}
            </div>
            <button onClick={switchCamera} className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
              <SwitchCamera className="w-5 h-5 text-primary-foreground/70" />

            </button>
          </>
        )}
      </div>
      )}

      {/* Invitation Premium — dernière identification du jour consommée */}
      {premiumPrompt && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl animate-in slide-in-from-bottom">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-amber" />
            </div>
            <h2 className="text-center font-display text-lg font-bold text-foreground">
              {t('capture.quota.bannerTitle')}
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground leading-relaxed">
              {t('capture.quota.bannerBody')}
            </p>
            <button
              onClick={() => navigate('/premium')}
              className="mt-5 w-full rounded-full bg-primary px-4 py-3 font-display text-sm font-semibold text-primary-foreground"
            >
              {t('capture.quota.premiumCta')}
            </button>
            <button
              onClick={() => {
                setPremiumPrompt(false);
                navigate('/bestiaire');
              }}
              className="mt-2 w-full rounded-full px-4 py-3 font-display text-sm font-semibold text-muted-foreground"
            >
              {t('capture.quota.premiumLater')}
            </button>
          </div>
        </div>
      )}
    </main>
  );

};

export default CapturePage;
