import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Zap, MapPin, Image, SwitchCamera, X, Loader2, Plus, RefreshCw, PenLine, ZoomIn, Focus, Crosshair, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { type Rarity, RARITY_LABELS } from '@/data/mockData';
import { setPendingShelve } from '@/lib/shelveAnimation';
import { readFileAsDataUrl } from '@/lib/imageProcessing';
import { useCamera } from '@/hooks/useCamera';
import { useGeoTag } from '@/hooks/useGeoTag';
import { useAnimalIdentification } from '@/hooks/useAnimalIdentification';
import { useCaptureSave } from '@/hooks/useCaptureSave';
import { useCaptureReveal, REVEAL_TIMINGS } from '@/hooks/useCaptureReveal';
import type { AnimalResult } from '@/types/capture';

const rarityColors: Record<string, string> = {
  common: 'bg-rarity-common/20 text-rarity-common border-rarity-common/40',
  rare: 'bg-rarity-rare/20 text-rarity-rare border-rarity-rare/40',
  epic: 'bg-rarity-epic/20 text-rarity-epic border-rarity-epic/40',
  mythic: 'bg-rarity-mythic/20 text-rarity-mythic border-rarity-mythic/40',
};

const CapturePage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [animalResult, setAnimalResult] = useState<AnimalResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [duplicateCapture, setDuplicateCapture] = useState<{ id: string; image_url: string; animal_name: string } | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualSpecies, setManualSpecies] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const camera = useCamera({ paused: !!capturedPhoto });
  const geo = useGeoTag();
  const { identifying, identify } = useAnimalIdentification();
  const { revealPhase, revealRarity, freezeFlash, triggerReveal, reset: resetReveal } =
    useCaptureReveal(setAnimalResult);
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

  /** Shared pipeline for both the camera shot and the gallery import. */
  const processPhoto = useCallback(async (dataUrl: string) => {
    setCapturedPhoto(dataUrl);
    setAnimalResult(null);
    setSaved(false);
    geo.capture();

    const outcome = await identify(dataUrl);
    if (outcome.status === 'identified') {
      triggerReveal(outcome.animal);
    } else {
      setManualMode(true);
    }
  }, [geo, identify, triggerReveal]);

  const takePhoto = async () => {
    const dataUrl = grabFrame();
    if (!dataUrl) return;
    await processPhoto(dataUrl);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Sélectionne une image');
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    await processPhoto(dataUrl);
  };

  const resetCapture = () => {
    setCapturedPhoto(null);
    setAnimalResult(null);
    setSaved(false);
    setDuplicateCapture(null);
    setManualMode(false);
    setManualName('');
    setManualSpecies('');
    setManualDescription('');
    geo.reset();
    resetReveal();
    resumePreview();
  };

  const saveManualEntry = async () => {
    const trimmedName = manualName.trim();
    const trimmedSpecies = manualSpecies.trim();
    const trimmedDesc = manualDescription.trim();
    if (!trimmedName || !trimmedDesc) {
      toast.error('Remplis au moins le nom et la description');
      return;
    }
    try {
      const ok = await submitManualEntry({ name: trimmedName, species: trimmedSpecies, description: trimmedDesc });
      if (!ok) return;
      setSaved(true);
      toast.success('Soumis pour validation ! Tu seras notifié une fois approuvé.');
      setTimeout(() => navigate('/home'), 1500);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la soumission");
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
    setTimeout(() => navigate('/bestiaire'), 900);
  };

  const saveToCollection = async () => {
    if (!animalResult) return;
    try {
      const existing = await findDuplicate(animalResult.animal_name);
      if (existing) {
        setDuplicateCapture(existing);
        return;
      }
      const imageUrl = await insertCapture(animalResult);
      if (!imageUrl) return;
      finishSave(animalResult, imageUrl, `${animalResult.animal_name} ajouté à ton Faunex !`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const doReplaceExisting = async () => {
    if (!animalResult || !duplicateCapture) return;
    try {
      const imageUrl = await replaceCapture(animalResult, duplicateCapture.id);
      if (!imageUrl) return;
      finishSave(animalResult, imageUrl, `${animalResult.animal_name} mis à jour dans ton Faunex !`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour");
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
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      {/* Camera / photo / result */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Camera or captured photo background */}
        <div
          ref={videoContainerRef}
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
        {(animalResult || identifying || manualMode || revealPhase === 'freeze' || revealPhase === 'shaking') && (
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
          <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-full px-3 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary-foreground/70 text-xs font-display">{geoName || 'Localisation…'}</span>
          </div>
        </div>

        {/* AI Result overlay */}
        {identifying && (
          <div className="relative z-20 flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
              <p className="text-primary-foreground font-display text-sm">Identification en cours…</p>
            </div>
          </div>
        )}

        {/* Freeze phase — suspense */}
        {revealPhase === 'freeze' && (
          <div className="relative z-20 flex-1 flex items-center justify-center">
            <div className="text-center capture-freeze-pulse">
              <div className={`w-20 h-20 mx-auto rounded-full border-2 flex items-center justify-center mb-4 ${
                revealRarity === 'mythic' ? 'border-rarity-mythic/60 bg-rarity-mythic/10' :
                revealRarity === 'epic' ? 'border-rarity-epic/60 bg-rarity-epic/10' :
                revealRarity === 'rare' ? 'border-rarity-rare/60 bg-rarity-rare/10' :
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
            <div className="text-center reveal-shake" style={{ animationDuration: `${REVEAL_TIMINGS[revealRarity].shake}ms`, animationIterationCount: revealRarity === 'mythic' ? 3 : revealRarity === 'epic' ? 2 : 1 }}>
              <div className={`w-28 h-28 mx-auto rounded-2xl border-4 flex items-center justify-center relative overflow-hidden
                ${revealRarity === 'mythic' ? 'border-rarity-mythic bg-rarity-mythic/20 shadow-glow-amber capture-suspense-mythic' :
                  revealRarity === 'epic' ? 'border-rarity-epic bg-rarity-epic/20 capture-suspense-epic' :
                  revealRarity === 'rare' ? 'border-rarity-rare bg-rarity-rare/20 capture-suspense-rare' :
                  'border-muted-foreground/40 bg-muted/20'}`}
              >
                {capturedPhoto && <img src={capturedPhoto} alt="" className="w-full h-full object-cover blur-sm brightness-75" />}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl">❓</span>
                </div>
              </div>
              <p className="text-primary-foreground/80 font-display text-sm mt-4 font-semibold">
                {revealRarity === 'mythic' ? '✨ Quelque chose de légendaire…' :
                 revealRarity === 'epic' ? '💎 Découverte exceptionnelle…' :
                 revealRarity === 'rare' ? '🔹 Ça brille…' :
                 '🔍 Identification…'}
              </p>
            </div>
          </div>
        )}

        {/* Reveal animation — burst phase */}
        {revealPhase === 'burst' && animalResult && (
          <div className="relative z-20 flex-1 flex items-center justify-center">
            {/* Particle explosion for epic/mythic */}
            {(revealRarity === 'mythic' || revealRarity === 'epic') && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                {Array.from({ length: revealRarity === 'mythic' ? 20 : 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="capture-burst-particle"
                    style={{
                      left: '50%',
                      top: '50%',
                      '--angle': `${(360 / (revealRarity === 'mythic' ? 20 : 10)) * i}deg`,
                      '--distance': `${80 + Math.random() * 120}px`,
                      '--delay': `${Math.random() * 0.3}s`,
                      '--size': `${4 + Math.random() * 6}px`,
                      '--color': revealRarity === 'mythic'
                        ? `hsla(${42 + Math.random() * 20}, 85%, ${55 + Math.random() * 20}%, 0.9)`
                        : `hsla(${270 + Math.random() * 30}, 70%, ${55 + Math.random() * 15}%, 0.8)`,
                    } as React.CSSProperties}
                  />
                ))}
              </div>
            )}
            <div className={`reveal-${revealRarity} text-center px-6 z-20`}>
              <div className={`w-32 h-32 mx-auto rounded-2xl border-4 flex items-center justify-center relative overflow-hidden
                ${revealRarity === 'mythic' ? 'border-rarity-mythic mythic-shiny' :
                  revealRarity === 'epic' ? 'border-rarity-epic rarity-epic-glow' :
                  revealRarity === 'rare' ? 'border-rarity-rare rarity-rare-glow' :
                  'border-muted-foreground/40'}`}
              >
                {capturedPhoto && <img src={capturedPhoto} alt="" className="w-full h-full object-cover" />}
                {revealRarity === 'mythic' && (
                  <div className="mythic-sparkles">
                    <span /><span /><span /><span /><span /><span />
                  </div>
                )}
                {revealRarity === 'epic' && <div className="epic-image-overlay" />}
                {revealRarity === 'mythic' && <div className="mythic-image-overlay" />}
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

            </div>
          </div>
        )}

        {/* Manual entry form when AI can't identify */}
        {manualMode && !identifying && !animalResult && (
          <div className="relative z-20 flex-1 flex flex-col justify-end px-5 pb-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PenLine className="w-5 h-5 text-amber" />
                <h2 className="text-lg font-display font-bold text-primary-foreground">Animal non reconnu</h2>
              </div>
              <p className="text-primary-foreground/90 text-sm">
                Décris l'animal que tu as observé. Ta capture sera vérifiée par un modérateur avant d'être ajoutée à ton Faunex.
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
            ⚠️ {duplicateCapture.animal_name} est déjà dans ton Faunex !
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
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
            {saving ? 'Envoi…' : 'Soumettre pour validation'}
          </button>
        ) : identifying ? null : capturedPhoto ? null : (
          <>
            <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
              <Image className="w-5 h-5 text-primary-foreground/70" />
            </button>
            <button
              onClick={takePhoto}
              className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center group active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full bg-primary group-hover:bg-forest-light transition-colors flex items-center justify-center">
                <Camera className="w-7 h-7 text-primary-foreground" />
              </div>
            </button>
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
