import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Zap, MapPin, Image, SwitchCamera, X, Loader2, Plus, RefreshCw, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { type Rarity, RARITY_LABELS } from '@/data/mockData';

interface AnimalResult {
  animal_name: string;
  scientific_name: string;
  category: string;
  description: string;
  habitat: string;
  diet: string;
  conservation: string;
  fun_fact: string;
  rarity: Rarity;
}

const rarityColors: Record<string, string> = {
  common: 'bg-rarity-common/20 text-rarity-common border-rarity-common/40',
  uncommon: 'bg-rarity-uncommon/20 text-rarity-uncommon border-rarity-uncommon/40',
  rare: 'bg-rarity-rare/20 text-rarity-rare border-rarity-rare/40',
  epic: 'bg-rarity-epic/20 text-rarity-epic border-rarity-epic/40',
  legendary: 'bg-rarity-legendary/20 text-rarity-legendary border-rarity-legendary/40',
  mythic: 'bg-rarity-mythic/20 text-rarity-mythic border-rarity-mythic/40',
};

const CapturePage = () => {
  const { session } = useAuth();
  const [flash, setFlash] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [animalResult, setAnimalResult] = useState<AnimalResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareOnFeed, setShareOnFeed] = useState(false);
  const [caption, setCaption] = useState('');
  const [duplicateCapture, setDuplicateCapture] = useState<{ id: string; image_url: string; animal_name: string } | null>(null);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoName, setGeoName] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualSpecies, setManualSpecies] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast.error("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const switchCamera = () => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    setAnimalResult(null);
    setSaved(false);
    setShareOnFeed(false);
    setCaption('');

    // Grab GPS location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setGeoCoords(coords);
          // Reverse geocode
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&zoom=10&accept-language=fr`);
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village || '';
            const country = data.address?.country || '';
            setGeoName([city, country].filter(Boolean).join(', ') || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
          } catch {
            setGeoName(`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
          }
        },
        () => {
          setGeoCoords(null);
          setGeoName(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    // Identify
    setIdentifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('identify-animal', {
        body: { imageBase64: dataUrl },
      });
      if (error) throw error;
      if (data?.success && data.animal) {
        setAnimalResult(data.animal);
      } else {
        // Identification failed — offer manual entry
        setManualMode(true);
      }
    } catch (err: any) {
      console.error(err);
      setManualMode(true);
    } finally {
      setIdentifying(false);
    }
  };

  const resetCapture = () => {
    setCapturedPhoto(null);
    setAnimalResult(null);
    setSaved(false);
    setShareOnFeed(false);
    setCaption('');
    setDuplicateCapture(null);
    setGeoCoords(null);
    setGeoName(null);
    setManualMode(false);
    setManualName('');
    setManualSpecies('');
  };

  const saveManualEntry = async () => {
    if (!capturedPhoto || !session?.user) return;
    const trimmedName = manualName.trim();
    const trimmedSpecies = manualSpecies.trim();
    if (!trimmedName || !trimmedSpecies) {
      toast.error('Remplis le nom et l\'espèce');
      return;
    }
    setSaving(true);
    try {
      const imageUrl = await uploadImage();
      if (!imageUrl) return;

      const { error: insertError } = await supabase.from('captures').insert({
        user_id: session.user.id,
        image_url: imageUrl,
        animal_name: trimmedName,
        scientific_name: trimmedSpecies,
        category: null,
        description: null,
        habitat: null,
        diet: null,
        conservation: null,
        fun_fact: null,
        rarity: 'common',
        shared: false,
        caption: null,
        location: geoName || null,
        latitude: geoCoords?.lat || null,
        longitude: geoCoords?.lng || null,
        status: 'pending_review',
      });
      if (insertError) throw insertError;

      setSaved(true);
      toast.success('Soumis pour validation ! Tu seras notifié une fois approuvé.');
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de la soumission");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async () => {
    if (!capturedPhoto || !session?.user) return null;
    const fileName = `${session.user.id}/${Date.now()}.jpg`;
    const base64Data = capturedPhoto.split(',')[1];
    const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const { error: uploadError } = await supabase.storage
      .from('captures')
      .upload(fileName, byteArray, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('captures').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const saveToCollection = async () => {
    if (!capturedPhoto || !animalResult || !session?.user) return;
    setSaving(true);
    try {
      // Check for duplicate animal (case-insensitive match on animal_name)
      const { data: existing } = await supabase
        .from('captures')
        .select('id, image_url, animal_name')
        .eq('user_id', session.user.id)
        .ilike('animal_name', animalResult.animal_name)
        .limit(1);

      if (existing && existing.length > 0) {
        // Duplicate found — ask user
        setDuplicateCapture(existing[0]);
        setSaving(false);
        return;
      }

      // No duplicate — save normally
      await doSaveNew();
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const checkLevelUp = async (previousLevel: number) => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('level')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (data && data.level > previousLevel) {
      toast.success(`🎉 Niveau ${data.level} atteint ! Bravo, explorateur !`, {
        duration: 5000,
      });
    }
  };

  const doSaveNew = async () => {
    if (!capturedPhoto || !animalResult || !session?.user) return;
    setSaving(true);
    try {
      // Get current level before save
      const { data: profileBefore } = await supabase
        .from('profiles')
        .select('level')
        .eq('user_id', session.user.id)
        .maybeSingle();
      const levelBefore = profileBefore?.level || 1;

      const imageUrl = await uploadImage();
      if (!imageUrl) return;

      const { error: insertError } = await supabase.from('captures').insert({
        user_id: session.user.id,
        image_url: imageUrl,
        animal_name: animalResult.animal_name,
        scientific_name: animalResult.scientific_name,
        category: animalResult.category,
        description: animalResult.description,
        habitat: animalResult.habitat,
        diet: animalResult.diet,
        conservation: animalResult.conservation,
        fun_fact: animalResult.fun_fact,
        rarity: animalResult.rarity,
        shared: false,
        caption: null,
        location: geoName || null,
        latitude: geoCoords?.lat || null,
        longitude: geoCoords?.lng || null,
      });
      if (insertError) throw insertError;

      setSaved(true);
      setDuplicateCapture(null);
      toast.success(`${animalResult.animal_name} ajouté à ton Faunex !`);

      // Check for level up after a short delay (trigger needs time)
      setTimeout(() => checkLevelUp(levelBefore), 1000);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const doReplaceExisting = async () => {
    if (!capturedPhoto || !animalResult || !session?.user || !duplicateCapture) return;
    setSaving(true);
    try {
      const imageUrl = await uploadImage();
      if (!imageUrl) return;

      const { error: updateError } = await supabase
        .from('captures')
        .update({
          image_url: imageUrl,
          scientific_name: animalResult.scientific_name,
          category: animalResult.category,
          description: animalResult.description,
          habitat: animalResult.habitat,
          diet: animalResult.diet,
          conservation: animalResult.conservation,
          fun_fact: animalResult.fun_fact,
          rarity: animalResult.rarity,
          shared: shareOnFeed,
          caption: caption || null,
          location: geoName || null,
          latitude: geoCoords?.lat || null,
          longitude: geoCoords?.lng || null,
        })
        .eq('id', duplicateCapture.id);
      if (updateError) throw updateError;

      setSaved(true);
      setDuplicateCapture(null);
      toast.success(`${animalResult.animal_name} mis à jour dans ton Faunex !`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const keepExisting = () => {
    setDuplicateCapture(null);
    toast.info("Photo existante conservée");
    resetCapture();
  };

  return (
    <main className="min-h-screen bg-foreground flex flex-col pb-24">
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera / photo / result */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* Camera or captured photo background */}
        <div className="absolute inset-0">
          {capturedPhoto ? (
            <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay playsInline muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              {!cameraActive && (
                <div className="absolute inset-0 bg-foreground flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-12 h-12 text-primary-foreground/40 mx-auto mb-3" />
                    <p className="text-primary-foreground/50 text-sm font-display">Activation de la caméra…</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Overlay gradient for readability */}
        {(animalResult || identifying || manualMode) && (
          <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/70 to-transparent" />
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
          {capturedPhoto ? (
            <button onClick={resetCapture} className="p-3 rounded-full bg-primary-foreground/10 text-primary-foreground/60">
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setFlash(!flash)}
              className={`p-3 rounded-full transition-colors ${flash ? 'bg-amber text-amber-dark' : 'bg-primary-foreground/10 text-primary-foreground/60'}`}
            >
              <Zap className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-full px-3 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary-foreground/60 text-xs font-display">{geoName || 'Localisation…'}</span>
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

        {animalResult && !identifying && (
          <div className="relative z-20 flex-1 flex flex-col justify-end px-5 pb-4">
            <div className="space-y-3">
              {/* Rarity badge + name */}
              <div>
                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider border ${rarityColors[animalResult.rarity]}`}>
                  {RARITY_LABELS[animalResult.rarity as Rarity]}
                </span>
                <h2 className="text-2xl font-display font-bold text-primary-foreground mt-2">{animalResult.animal_name}</h2>
                <p className="text-primary-foreground/60 text-sm italic">{animalResult.scientific_name}</p>
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
              <p className="text-primary-foreground/70 text-sm">
                Renseigne le nom et l'espèce. Ta capture sera soumise à validation avant d'être ajoutée.
              </p>
              <input
                type="text"
                placeholder="Nom de l'animal (ex: Lynx boréal)"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 bg-primary-foreground/10 rounded-xl text-sm text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
              />
              <input
                type="text"
                placeholder="Nom scientifique (ex: Lynx lynx)"
                value={manualSpecies}
                onChange={e => setManualSpecies(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 bg-primary-foreground/10 rounded-xl text-sm text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body italic"
              />
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
              <p className="text-[10px] text-primary-foreground/50 font-display mb-1">Actuelle</p>
              <img src={duplicateCapture.image_url} alt="" className="w-20 h-20 rounded-xl object-cover border border-primary-foreground/20" />
            </div>
            <div className="text-primary-foreground/40 text-lg">→</div>
            <div className="text-center">
              <p className="text-[10px] text-primary-foreground/50 font-display mb-1">Nouvelle</p>
              {capturedPhoto && <img src={capturedPhoto} alt="" className="w-20 h-20 rounded-xl object-cover border-2 border-primary" />}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={keepExisting}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-foreground/10 text-primary-foreground/70 text-xs font-display font-semibold"
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
        ) : duplicateCapture ? null : animalResult ? (
          <button
            onClick={saveToCollection}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-display text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Sauvegarde…' : 'Ajouter au Faunex'}
          </button>
        ) : identifying ? null : capturedPhoto ? null : (
          <>
            <button className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
              <Image className="w-5 h-5 text-primary-foreground/60" />
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
              <SwitchCamera className="w-5 h-5 text-primary-foreground/60" />
            </button>
          </>
        )}
      </div>
    </main>
  );
};

export default CapturePage;
