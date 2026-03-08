import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Zap, MapPin, Image, SwitchCamera, X, Loader2, Share2, Plus, Check } from 'lucide-react';
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
        toast.error(data?.error || "Impossible d'identifier l'animal");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de l'identification");
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
  };

  const saveToCollection = async () => {
    if (!capturedPhoto || !animalResult || !session?.user) return;
    setSaving(true);
    try {
      // Upload image to storage
      const fileName = `${session.user.id}/${Date.now()}.jpg`;
      const base64Data = capturedPhoto.split(',')[1];
      const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from('captures')
        .upload(fileName, byteArray, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('captures').getPublicUrl(fileName);

      // Insert capture
      const { error: insertError } = await supabase.from('captures').insert({
        user_id: session.user.id,
        image_url: urlData.publicUrl,
        animal_name: animalResult.animal_name,
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
      });
      if (insertError) throw insertError;

      setSaved(true);
      toast.success(`${animalResult.animal_name} ajouté à ton Faunex !`);
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
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
        {(animalResult || identifying) && (
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
            <span className="text-primary-foreground/60 text-xs font-display">Localisation active</span>
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

              {/* Share toggle */}
              {!saved && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShareOnFeed(!shareOnFeed)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-display transition-colors w-full ${
                      shareOnFeed ? 'bg-primary/20 text-primary' : 'bg-primary-foreground/10 text-primary-foreground/60'
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{shareOnFeed ? 'Sera partagé sur le feed' : 'Partager sur le feed ?'}</span>
                  </button>

                  {shareOnFeed && (
                    <input
                      type="text"
                      placeholder="Ajoute une légende… (optionnel)"
                      value={caption}
                      onChange={e => setCaption(e.target.value)}
                      className="w-full px-4 py-2.5 bg-primary-foreground/10 rounded-xl text-sm text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 flex items-center justify-center gap-6 py-6 px-6">
        {saved ? (
          <button onClick={resetCapture} className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-display text-sm">
            <Camera className="w-4 h-4" />
            Nouvelle capture
          </button>
        ) : animalResult ? (
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
