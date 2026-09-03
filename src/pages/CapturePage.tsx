import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Zap, MapPin, SwitchCamera, X, Loader2, Plus, RefreshCw, PenLine, ZoomIn, Focus, Crosshair, ArrowLeft, Clock, Info, Sparkles, ShieldQuestion, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { type Rarity, RARITY_LABELS, RARITY_FX, RARITY_RANK } from '@/data/mockData';
import { setPendingShelve } from '@/lib/shelveAnimation';
import { prepareSourceImage, prepareSourceFile } from '@/lib/imageProcessing';
import { isHeicFile, readExifCameraInfo } from '@/lib/exif';
import { useCamera } from '@/hooks/useCamera';
import { useGeoTag } from '@/hooks/useGeoTag';
import { useAnimalIdentification, type RejectionKind } from '@/hooks/useAnimalIdentification';
import { useCaptureSave } from '@/hooks/useCaptureSave';
import { useCaptureReveal, REVEAL_TIMINGS } from '@/hooks/useCaptureReveal';
import { useSpeciesFinders } from '@/hooks/useSpeciesFinders';
import FindersBadge from '@/components/FindersBadge';
import { useCaptureQuota, DAILY_CAPTURE_LIMIT } from '@/hooks/useCaptureQuota';

import type { AnimalResult } from '@/types/capture';

const rarityColors: Record<string, string> = {
  common: 'bg-rarity-common/20 text-rarity-common border-rarity-common/40',
  rare: 'bg-rarity-rare/20 text-rarity-rare border-rarity-rare/40',
  uncommon: 'bg-rarity-uncommon/20 text-rarity-uncommon border-rarity-uncommon/40',
  very_rare: 'bg-rarity-very-rare/20 text-rarity-very-rare border-rarity-very-rare/40',
  ultra_rare: 'bg-rarity-silver/20 text-rarity-silver border-rarity-silver/40',
  illustration_rare: 'bg-rarity-gold/20 text-rarity-gold border-rarity-gold/40',
  special_rare: 'bg-rarity-gold/20 text-rarity-gold border-rarity-gold/40',
  hyper_rare: 'bg-rarity-gold/20 text-rarity-gold border-rarity-gold/40',
};

/** Accroches affichées à l'ouverture de la caméra : une seule, choisie au hasard. */
const CAPTURE_MOTIVATION_MESSAGES = [
  'Prêt à capturer quelque chose de rare ?',
  'Quel animal vas-tu découvrir ?',
  'Garde les yeux ouverts…',
  'Une nouvelle découverte t’attend.',
  'Regarde bien autour de toi…',
  'Et si la prochaine capture était exceptionnelle ?',
  'À toi de jouer !',
  'Nouvelle capture, nouvelle chance.',
  'Le prochain animal pourrait te surprendre.',
  'Bonne chance pour ta prochaine capture !',
  'Une capture rare est peut-être proche…',
  'Explore. Observe. Capture.',
  'C’est parti pour une nouvelle capture !',
  'Quel sera ton prochain ajout à la collection ?',
  'Ta collection peut encore s’agrandir.',
  'La nature réserve toujours des surprises.',
  'Prêt à ajouter une nouvelle découverte ?',
  'Peut-être une capture mémorable aujourd’hui…',
  'Et si celle-ci était légendaire ?',
  'À la recherche de ta prochaine découverte…',
];

const CapturePage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [animalResult, setAnimalResult] = useState<AnimalResult | null>(null);
  const [saved, setSaved] = useState(false);
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
const [manualMode, setManualMode] = useState(false);
  /** Repli taxonomique honnête renvoyé par le serveur (genre / famille). */
  const [taxonHint, setTaxonHint] = useState<string | null>(null);
  /** true quand l'import galerie n'a pas de signature d'appareil (EXIF) :
   *  la photo part en vérification humaine, sans analyse IA. */
  const [exifFlagged, setExifFlagged] = useState(false);
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
  const motivation = useMemo(
    () => CAPTURE_MOTIVATION_MESSAGES[Math.floor(Math.random() * CAPTURE_MOTIVATION_MESSAGES.length)],
    [],
  );

  const { revealPhase, revealRarity, freezeFlash, triggerReveal, reset: resetReveal } =
    useCaptureReveal(setAnimalResult);
  const revealFx = RARITY_FX[revealRarity];
  /* Popularité de l'espèce identifiée : combien de naturalistes l'ont déjà capturée. */
  const speciesFinders = useSpeciesFinders(animalResult?.animal_name, !!animalResult);
  const revealRank = RARITY_RANK[revealRarity] ?? 0;
  const { saving, findDuplicate, insertCapture, replaceCapture, submitManualEntry } = useCaptureSave({
    userId: session?.user?.id,
    photo: capturedPhoto,
    geo: { coords: geo.coords, name: geo.name },
  });

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
  ) => {
    // The daily slot is only consumed when the capture is added to the Faunex.
    if (quota.exhausted) {
      toast.error(`Limite atteinte : ${DAILY_CAPTURE_LIMIT} captures par jour maximum. Reviens demain !`);
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
      toast.error("Cette image n'a pas pu être lue. Réessaie avec une autre photo (JPEG ou PNG).");
      return;
    }
    setCapturedPhoto(dataUrl);

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
    }
  }, [geo, identify, triggerReveal, quota]);

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
    }
  }, [capturedPhoto, identify, triggerReveal]);





const takePhoto = async () => {
    setCapturing(true);
    if (captureTimerRef.current) window.clearTimeout(captureTimerRef.current);
    captureTimerRef.current = window.setTimeout(() => setCapturing(false), 700);
    const dataUrl = grabFrame();
    if (!dataUrl) {
      toast.error('La caméra se réinitialise, réessaie dans un instant');
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
  const importFromGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permet de réimporter deux fois de suite le même fichier.
    e.target.value = '';
    if (!file) return;
    try {
const exif = isHeicFile(file) ? null : await readExifCameraInfo(file);
      const suspicious = exif !== null && !exif.looksLikeCameraPhoto;
      const reason = suspicious
        ? "Cette photo n'a pas de métadonnées d'appareil (EXIF) : impossible de confirmer qu'elle vient de ton appareil. Si l'IA ne reconnaît pas l'espèce, renseigne-la et un modérateur validera ton observation."
        : undefined;
      const prepared = await prepareSourceFile(file);
      if (!prepared) {
        toast.error("Impossible de lire cette photo. Réessaie avec une autre image.");
        return;
      }
      await processPhoto(prepared, reason, exif?.gps ?? null);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de lire cette photo. Réessaie avec une autre image.");
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
      toast.error(`Limite atteinte : ${DAILY_CAPTURE_LIMIT} captures par jour maximum. Reviens demain !`);
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
    const trimmedSpecies = manualSpecies.trim();
    const trimmedDesc = manualDescription.trim();
    if (!trimmedName || !trimmedDesc) {
      toast.error('Remplis au moins le nom et la description');
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
        ? `\n\n[Vérification demandée] L'IA proposait : ${disputedResult.animal_name}${
            disputedResult.scientific_name ? ` (${disputedResult.scientific_name})` : ''
          }${typeof disputedResult.confidence === 'number' ? ` — ${disputedResult.confidence}% de confiance` : ''}.`
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
          ? 'Vérification demandée ! Un modérateur va confirmer ou corriger l\'identification.'
          : 'Soumis pour validation ! Tu seras notifié une fois approuvé.'
      );
      setTimeout(() => navigate('/home'), 1500);
    } catch (err) {
      console.error(err);
      if (consumed) await quota.refund();
      toast.error(isDailyLimitError(err) ? "Limite atteinte : 4 captures par jour maximum. Reviens demain !" : "Erreur lors de la soumission");
    }
  };


  const finishSave = (animal: AnimalResult, imageUrl: string, message: string) => {
    setSaved(true);
    setDuplicateCapture(null);
    toast.success(message);
    setPendingShelve({
      animalName: animal.animal_name,
      category: animal.category,
      rarity: animal.rarity,
      imageUrl,
    });
    setTimeout(() => navigate('/home'), 900);
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
      finishSave(animalResult, imageUrl, `${animalResult.animal_name} ajouté à ton Faunex !`);
    } catch (err) {
      console.error(err);
      if (consumed) await quota.refund();
      const msg = String((err as { message?: string })?.message ?? err);
      if (msg.includes('unique_species_per_user') || msg.includes('duplicate key')) {
        // Sécurité serveur : l'espèce existe déjà sous un autre nom commun.
        toast.error(`Tu as déjà cette espèce dans ton Faunex (${animalResult.scientific_name ?? animalResult.animal_name}).`);
        return;
      }
      toast.error(isDailyLimitError(err) ? "Limite atteinte : 4 captures par jour maximum. Reviens demain !" : "Erreur lors de la sauvegarde");
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
      finishSave(animalResult, imageUrl, `${animalResult.animal_name} mis à jour dans ton Faunex !`);
    } catch (err) {
      console.error(err);
      if (consumed) await quota.refund();
      toast.error("Erreur lors de la mise à jour");
    } finally {
      savingRef.current = false;
    }
  };




  const keepExisting = () => {
    setDuplicateCapture(null);
    toast.info("Photo existante conservée");
    resetCapture();
  };

  const geoName = geo.name;


  return (
    <main className="min-h-screen bg-foreground flex flex-col pb-24">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,.heic,.heif"
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
                <p className="text-primary-foreground/70 text-sm font-display">Activation de la caméra…</p>
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

        {/* Freeze flash overlay */}
        {freezeFlash && (
          <div className="absolute inset-0 z-30 bg-white pointer-events-none animate-capture-flash" />
        )}

        {/* Overlay gradient for readability */}
        {(animalResult || identifying || manualMode || identifyError || rejectedImage || revealPhase === 'freeze' || revealPhase === 'shaking') && (
          <div className={`absolute inset-0 transition-opacity duration-300 ${
            revealPhase === 'freeze' ? 'bg-black/60' :
            revealPhase === 'shaking' ? 'bg-gradient-to-t from-black/90 via-black/60 to-black/40' :
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
            {quota.remaining !== null && (
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${quota.exhausted ? 'bg-destructive/25' : 'bg-primary-foreground/10'}`}>
                <Camera className={`w-3.5 h-3.5 ${quota.exhausted ? 'text-destructive' : 'text-primary'}`} />
                <span className="text-primary-foreground/80 text-xs font-display">
                  {quota.remaining}/{DAILY_CAPTURE_LIMIT}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-full px-3 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary-foreground/70 text-xs font-display">{geoName || 'Localisation…'}</span>
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
                  <p className="text-primary-foreground font-display font-bold text-sm">Pause nature 🌿</p>
                  <p className="text-primary-foreground/80 text-xs mt-1 leading-relaxed">
                    Tu as bien exploré aujourd'hui ! Faunex est un projet indépendant, c'est pourquoi les captures sont limitées à 4 par jour.
                  </p>
                  <button
                    onClick={() => navigate('/premium')}
                    className="mt-2 rounded-full bg-primary-foreground/90 px-3 py-1.5 text-xs font-display font-semibold text-primary"
                  >
                    Captures illimitées avec Premium ✨
                  </button>
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
                  ? 'Préparation de la photo…'
                  : identifyStage === 'retrying'
                    ? 'Nouvelle tentative d’identification…'
                    : 'Identification en cours…'}
              </p>
              <p className="text-primary-foreground/60 text-xs mt-2">
                {elapsed < 6
                  ? 'L’IA compare ta photo aux espèces connues.'
                  : elapsed < 15
                    ? `Analyse un peu plus longue que d’habitude… (${elapsed}s)`
                    : `Toujours en cours, ne quitte pas l’écran (${elapsed}s)`}
              </p>
            </div>
          </div>
        )}


        {/* Freeze phase — suspense */}
        {revealPhase === 'freeze' && (
          <div className="relative z-20 flex-1 flex items-center justify-center">
            <div className="text-center capture-freeze-pulse">
              <div className={`w-20 h-20 mx-auto rounded-full border-2 flex items-center justify-center mb-4 ${
                revealFx === 'gold' ? 'border-rarity-gold/60 bg-rarity-gold/10' :
                revealFx === 'silver' ? 'border-rarity-silver/60 bg-rarity-silver/10' :
                revealRank >= 2 ? 'border-foreground/50 bg-foreground/10' :
                'border-muted-foreground/30 bg-muted/10'
              }`}>
                <div className="w-3 h-3 rounded-full bg-primary-foreground/80 animate-pulse" />
              </div>
              <p className="text-primary-foreground/70 font-display text-xs tracking-widest uppercase">Analyse en cours</p>
            </div>
          </div>
        )}

        {/* Reveal animation — shaking phase */}
        {revealPhase === 'shaking' && (
          <div className="relative z-20 flex-1 flex items-center justify-center">
            <div className="text-center reveal-shake" style={{ animationDuration: `${REVEAL_TIMINGS[revealRarity].shake}ms`, animationIterationCount: revealFx === 'gold' ? 3 : revealFx === 'silver' ? 2 : 1 }}>
              <div className={`w-28 h-28 mx-auto rounded-2xl border-4 flex items-center justify-center relative overflow-hidden
                ${revealFx === 'gold' ? 'border-rarity-gold bg-rarity-gold/20 shadow-glow-amber capture-suspense-gold' :
                  revealFx === 'silver' ? 'border-rarity-silver bg-rarity-silver/20 capture-suspense-silver' :
                  revealRank >= 2 ? 'border-foreground/60 bg-foreground/10 capture-suspense-rare' :
                  'border-muted-foreground/40 bg-muted/20'}`}
              >
                {capturedPhoto && <img src={capturedPhoto} alt="" className="w-full h-full object-cover blur-sm brightness-75" />}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl">❓</span>
                </div>
              </div>
              <p className="text-primary-foreground/80 font-display text-sm mt-4 font-semibold">
                {revealFx === 'gold' ? '✨ Quelque chose de légendaire…' :
                 revealFx === 'silver' ? '💎 Découverte exceptionnelle…' :
                 revealRank >= 2 ? '🔹 Ça brille…' :
                 '🔍 Identification…'}
              </p>
            </div>
          </div>
        )}

        {/* Reveal animation — burst phase */}
        {revealPhase === 'burst' && animalResult && (
          <div className="relative z-20 flex-1 flex items-center justify-center">
            {/* Particle explosion pour les raretés argent & or */}
            {revealFx !== 'ink' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                {Array.from({ length: revealFx === 'gold' ? 20 : 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="capture-burst-particle"
                    style={{
                      left: '50%',
                      top: '50%',
                      '--angle': `${(360 / (revealFx === 'gold' ? 20 : 10)) * i}deg`,
                      '--distance': `${80 + Math.random() * 120}px`,
                      '--delay': `${Math.random() * 0.3}s`,
                      '--size': `${4 + Math.random() * 6}px`,
                      '--color': revealFx === 'gold'
                        ? `hsla(${42 + Math.random() * 20}, 85%, ${55 + Math.random() * 20}%, 0.9)`
                        : `hsla(${210 + Math.random() * 20}, 30%, ${70 + Math.random() * 20}%, 0.85)`,
                    } as React.CSSProperties}
                  />
                ))}
              </div>
            )}
            <div className={`reveal-${revealFx === 'ink' ? (revealRank >= 2 ? 'rare' : 'common') : revealFx} text-center px-6 z-20`}>
              <div className={`w-32 h-32 mx-auto rounded-2xl border-4 flex items-center justify-center relative overflow-hidden
                ${revealFx === 'gold' ? 'border-rarity-gold gold-shiny' :
                  revealFx === 'silver' ? 'border-rarity-silver rarity-silver-glow' :
                  revealRank >= 2 ? 'border-foreground/60 rarity-rare-glow' :
                  'border-muted-foreground/40'}`}
              >
                {capturedPhoto && <img src={capturedPhoto} alt="" className="w-full h-full object-cover" />}
                {revealFx === 'gold' && (
                  <div className="gold-sparkles">
                    <span /><span /><span /><span /><span /><span />
                  </div>
                )}
                {revealFx === 'silver' && <div className="silver-image-overlay" />}
                {revealFx === 'gold' && <div className="gold-image-overlay" />}
              </div>
              <span className={`inline-block mt-4 px-3 py-1 rounded-full text-xs font-display font-bold uppercase tracking-wider border ${rarityColors[revealRarity]}`}>
                {RARITY_LABELS[revealRarity]}
              </span>
              <h2 className="text-2xl font-display font-bold text-primary-foreground mt-2">{animalResult.animal_name}</h2>
              <p className="text-primary-foreground/70 text-sm italic">{animalResult.scientific_name}</p>
            </div>
          </div>
        )}

        {animalResult && !identifying && revealPhase === 'done' && (
          <div className="relative z-20 flex-1 flex flex-col justify-end px-5 pb-4">
            <div className="space-y-3">
              {/* Rarity badge + name */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider border ${rarityColors[animalResult.rarity]}`}>
                    {RARITY_LABELS[animalResult.rarity as Rarity]}
                  </span>
                  {typeof animalResult.confidence === 'number' && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider border shadow-[0_2px_8px_rgba(0,0,0,0.5)] ring-1 ring-black/40 ${
                        animalResult.confidence >= 80
                          ? 'bg-emerald-500 text-white border-emerald-200'
                          : animalResult.confidence >= 50
                          ? 'bg-amber-400 text-black border-amber-100'
                          : 'bg-red-500 text-white border-red-200'
                      }`}
                      title="Niveau de confiance de l'IA"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {animalResult.confidence}% sûr
                    </span>
                  )}
                  {speciesFinders !== undefined && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full bg-black/45 border border-white/20 px-2.5 py-1 backdrop-blur-sm"
                      title={`${speciesFinders} naturaliste${speciesFinders > 1 ? 's' : ''} ont capturé cette espèce`}
                    >
                      <FindersBadge count={speciesFinders} />
                      <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-primary-foreground/80">
                        {speciesFinders > 1 ? 'captures' : 'capture'}
                      </span>
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-display font-bold text-primary-foreground mt-2">{animalResult.animal_name}</h2>
                <p className="text-primary-foreground/70 text-sm italic">{animalResult.scientific_name}</p>
                {animalResult.alternatives && animalResult.alternatives.length > 0 && typeof animalResult.confidence === 'number' && animalResult.confidence < 80 && (
                  <p className="text-primary-foreground/70 text-[11px] font-display mt-1.5">
                    Aussi possible : {animalResult.alternatives.slice(0, 3).join(' · ')}
                  </p>
                )}
              </div>

              {/* Description */}
              <p className="text-primary-foreground/80 text-sm leading-relaxed">{animalResult.description}</p>

              {/* Fun fact */}
              <div className="bg-primary-foreground/10 rounded-xl px-4 py-3">
                <p className="text-primary-foreground/90 text-xs font-display">💡 {animalResult.fun_fact}</p>
              </div>

              {/* L'utilisateur peut contester l'identification et demander un arbitrage humain */}
              <button
                onClick={requestVerification}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary-foreground/25 bg-primary-foreground/5 text-primary-foreground/85 text-xs font-display font-semibold"
              >
                <ShieldQuestion className="w-4 h-4" />
                Ce n'est pas le bon animal — Demander une vérification
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
                <h2 className="text-lg font-display font-bold text-primary-foreground">Analyse interrompue</h2>
              </div>
              <p className="text-primary-foreground/90 text-sm">{identifyError}</p>
              <div className="flex gap-3">
                <button
                  onClick={retryIdentify}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Relancer l'analyse
                </button>
                <button
                  onClick={() => { setIdentifyError(null); setManualMode(true); }}
                  className="flex-1 py-3 rounded-xl bg-primary-foreground/10 text-primary-foreground font-display font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <PenLine className="w-4 h-4" /> Saisir à la main
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
                  <RefreshCw className="w-4 h-4" /> Reprendre
                </button>
                <button
                  onClick={() => setManualMode(true)}
                  className="flex-1 py-3 rounded-xl bg-primary-foreground/10 text-primary-foreground font-display font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <ShieldQuestion className="w-4 h-4" /> Faire vérifier
                </button>
              </div>
              <p className="text-primary-foreground/60 text-[11px] text-center">
                Tu penses que l'IA se trompe ? Envoie ta capture à un modérateur.
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
                    ? 'Vérification humaine'
                    : disputedResult || rejectedImage
                      ? 'Demander une vérification'
                      : 'Animal non reconnu'}
                </h2>
              </div>
              {disputedResult && (
                <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-2">
                  <p className="text-[10px] font-display uppercase tracking-wide text-primary-foreground/60">
                    Proposition de l'IA
                  </p>
                  <p className="text-sm text-primary-foreground/90 font-display">
                    {disputedResult.animal_name}
                    {typeof disputedResult.confidence === 'number' && ` · ${disputedResult.confidence}% sûr`}
                  </p>
                </div>
              )}
              {!disputedResult && rejectedImage && (
                <div className="rounded-xl border border-amber/30 bg-amber/10 px-3 py-2">
                  <p className="text-[10px] font-display uppercase tracking-wide text-primary-foreground/60">
                    Refus de l'IA
                  </p>
                  <p className="text-sm text-primary-foreground/90">{rejectedImage.title}</p>
                </div>
              )}
{!disputedResult && !rejectedImage && taxonHint && (
                <div className="rounded-xl border border-amber/30 bg-amber/10 px-3 py-2.5">
                  {exifFlagged && (
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-display font-semibold uppercase tracking-wide text-amber">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      Pourquoi cette photo part en modération ?
                    </p>
                  )}
                  <p className="text-sm text-primary-foreground/90">{taxonHint}</p>
                </div>
              )}
              <p className="text-primary-foreground/90 text-sm">
                {disputedResult
                  ? "Indique l'animal que tu as observé. Un modérateur confirmera ou corrigera l'identification avant l'ajout à ton Faunex."
                  : rejectedImage
                    ? "Explique ce que tu as observé : un modérateur regardera ta photo. Si l'image ne respecte pas les règles de Faunex, elle sera refusée."
                    : "Décris l'animal que tu as observé. Ta capture sera vérifiée par un modérateur avant d'être ajoutée à ton Faunex."}
              </p>


              <input
                type="text"
                placeholder="Nom de l'animal (ex: Lynx boréal)"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 bg-primary-foreground/10 rounded-xl text-sm text-primary-foreground placeholder:text-primary-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
              />
              <input
                type="text"
                placeholder="Nom scientifique (optionnel)"
                value={manualSpecies}
                onChange={e => setManualSpecies(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 bg-primary-foreground/10 rounded-xl text-sm text-primary-foreground placeholder:text-primary-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body italic"
              />
              <textarea
                placeholder="Décris l'animal : couleur, taille, comportement, lieu d'observation…"
                value={manualDescription}
                onChange={e => setManualDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2.5 bg-primary-foreground/10 rounded-xl text-sm text-primary-foreground placeholder:text-primary-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body resize-none"
              />
              <p className="text-primary-foreground/70 text-[10px] text-right">{manualDescription.length}/500</p>
            </div>
          </div>
        )}
      </div>

      {/* Duplicate detection dialog */}
      {duplicateCapture && (
        <div className="relative z-30 bg-foreground/95 backdrop-blur-sm px-5 py-4 space-y-3 border-t border-primary-foreground/10">
          <p className="text-primary-foreground font-display font-semibold text-sm text-center">
            ⚠️ Tu as déjà cette espèce dans ton Faunex : {duplicateCapture.animal_name}
          </p>

          <div className="flex gap-3 items-center justify-center">
            <div className="text-center">
              <p className="text-[10px] text-primary-foreground/70 font-display mb-1">Actuelle</p>
              <img src={duplicateCapture.image_url} alt="" className="w-20 h-20 rounded-xl object-cover border border-primary-foreground/20" />
            </div>
            <div className="text-primary-foreground/70 text-lg">→</div>
            <div className="text-center">
              <p className="text-[10px] text-primary-foreground/70 font-display mb-1">Nouvelle</p>
              {capturedPhoto && <img src={capturedPhoto} alt="" className="w-20 h-20 rounded-xl object-cover border-2 border-primary" />}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={keepExisting}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-foreground/10 text-primary-foreground/90 text-xs font-display font-semibold"
            >
              <X className="w-3.5 h-3.5" /> Garder l'actuelle
            </button>
            <button
              onClick={doReplaceExisting}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-display font-semibold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Remplacer la photo
            </button>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="relative z-10 flex items-center justify-center gap-6 py-6 px-6">
        {saved ? (
          <button onClick={resetCapture} className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-display text-sm">
            <Camera className="w-4 h-4" />
            Nouvelle capture
          </button>
        ) : duplicateCapture ? null : (animalResult && revealPhase === 'done') ? (
          <div className="flex items-center gap-3 w-full max-w-sm">
            <button
              onClick={resetCapture}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-primary-foreground/10 text-primary-foreground/80 font-display text-sm"
            >
              Ne pas ajouter
            </button>
            <button
              onClick={saveToCollection}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-primary text-primary-foreground font-display text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Sauvegarde…' : 'Ajouter'}
            </button>
          </div>
        ) : manualMode ? (
          <button
            onClick={saveManualEntry}
            disabled={saving || !manualName.trim() || !manualDescription.trim()}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-amber text-foreground font-display text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : disputedResult ? <ShieldQuestion className="w-4 h-4" /> : <PenLine className="w-4 h-4" />}
            {saving ? 'Envoi…' : disputedResult ? 'Demander une vérification' : 'Soumettre pour validation'}
          </button>
        ) : identifying ? null : capturedPhoto ? null : (
          <>
            {/* Import depuis la bibliothèque photo (web app + apps natives). */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={quota.exhausted}
              aria-label="Importer une photo depuis la galerie"
              className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center disabled:opacity-40"
            >
              <ImageIcon className="w-5 h-5 text-primary-foreground/70" />
            </button>


            <div className="flex flex-col items-center gap-2">
<button
                onClick={takePhoto}
                disabled={quota.exhausted}
                aria-label={quota.exhausted ? 'Quota de captures atteint' : 'Prendre une photo'}
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
    </main>
  );
};

export default CapturePage;
