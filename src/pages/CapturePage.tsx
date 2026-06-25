import { useState, useRef, useEffect, useCallback, TouchEvent as ReactTouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Zap, MapPin, Image, SwitchCamera, X, Loader2, Plus, RefreshCw, PenLine, ZoomIn, Focus, Crosshair, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { type Rarity, RARITY_LABELS } from '@/data/mockData';
import { setPendingShelve } from '@/lib/shelveAnimation';

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
  confidence?: number;
  alternatives?: string[];
}

const rarityColors: Record<string, string> = {
  common: 'bg-rarity-common/20 text-rarity-common border-rarity-common/40',
  rare: 'bg-rarity-rare/20 text-rarity-rare border-rarity-rare/40',
  epic: 'bg-rarity-epic/20 text-rarity-epic border-rarity-epic/40',
  mythic: 'bg-rarity-mythic/20 text-rarity-mythic border-rarity-mythic/40',
};

/** Compress an image dataURL to a max dimension and JPEG quality for AI.
 *  Higher resolution + quality => better recognition accuracy. */
const compressForAI = (dataUrl: string, maxSize = 1600, quality = 0.85): Promise<string> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
};

const CapturePage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [flash, setFlash] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [animalResult, setAnimalResult] = useState<AnimalResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revealPhase, setRevealPhase] = useState<'idle' | 'freeze' | 'shaking' | 'burst' | 'done'>('idle');
  const [revealRarity, setRevealRarity] = useState<Rarity>('common');
  const [freezeFlash, setFreezeFlash] = useState(false);
  const [duplicateCapture, setDuplicateCapture] = useState<{ id: string; image_url: string; animal_name: string } | null>(null);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoName, setGeoName] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualSpecies, setManualSpecies] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(5);
  const [supportsNativeZoom, setSupportsNativeZoom] = useState(false);
  const [focusMode, setFocusMode] = useState<'auto' | 'manual'>('auto');
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [focusAnimating, setFocusAnimating] = useState(false);
  const [supportsFocus, setSupportsFocus] = useState(false);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartZoom = useRef<number>(1);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // Check native zoom support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities?.zoom) {
        setSupportsNativeZoom(true);
        setMaxZoom(Math.min(capabilities.zoom.max, 10));
      } else {
        setSupportsNativeZoom(false);
        setMaxZoom(5);
      }
      setZoomLevel(1);

      // Check focus support
      const hasFocusMode = !!(capabilities?.focusMode);
      setSupportsFocus(hasFocusMode);
      if (hasFocusMode && capabilities.focusMode.includes('continuous')) {
        try {
          await (track as any).applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
        } catch {}
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast.error("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  }, [facingMode, stopCamera]);

  // Toggle torch (flash) on the active camera track
  useEffect(() => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const capabilities = track.getCapabilities?.() as any;
    if (capabilities?.torch) {
      try {
        (track as any).applyConstraints({ advanced: [{ torch: flash } as any] });
      } catch (e) {
        console.warn('Torch not supported', e);
      }
    }
  }, [flash, cameraActive]);


  const applyZoom = useCallback((newZoom: number) => {
    const clamped = Math.max(1, Math.min(newZoom, maxZoom));
    setZoomLevel(clamped);

    if (supportsNativeZoom && streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        (track as any).applyConstraints({ advanced: [{ zoom: clamped } as any] });
      } catch {}
    }
  }, [maxZoom, supportsNativeZoom]);

  // Pinch-to-zoom handlers
  const getDistance = (touches: globalThis.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: ReactTouchEvent) => {
    if (e.touches.length === 2) {
      pinchStartDistance.current = getDistance(e.nativeEvent.touches);
      pinchStartZoom.current = zoomLevel;
    }
  }, [zoomLevel]);

  const handleTouchMove = useCallback((e: ReactTouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistance.current !== null) {
      e.preventDefault();
      const currentDistance = getDistance(e.nativeEvent.touches);
      const scale = currentDistance / pinchStartDistance.current;
      applyZoom(pinchStartZoom.current * scale);
    }
  }, [applyZoom]);

  const handleTouchEnd = useCallback(() => {
    pinchStartDistance.current = null;
  }, []);

  // Tap-to-focus handler
  const handleTapToFocus = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (capturedPhoto || !cameraActive || !streamRef.current) return;

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Show focus indicator
    setFocusPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setFocusAnimating(true);
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    focusTimeoutRef.current = setTimeout(() => {
      setFocusAnimating(false);
      setTimeout(() => setFocusPoint(null), 300);
    }, 1000);

    // Apply focus point if supported
    if (supportsFocus) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        const constraints: any = {
          advanced: [{
            focusMode: 'manual',
            pointsOfInterest: [{ x, y }],
          }],
        };
        (track as any).applyConstraints(constraints);
        setFocusMode('manual');
      } catch {}
    }
  }, [capturedPhoto, cameraActive, supportsFocus]);

  // Toggle between auto and manual focus
  const toggleFocusMode = useCallback(() => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    const newMode = focusMode === 'auto' ? 'manual' : 'auto';

    if (supportsFocus) {
      try {
        const mode = newMode === 'auto' ? 'continuous' : 'manual';
        (track as any).applyConstraints({ advanced: [{ focusMode: mode } as any] });
      } catch {}
    }

    setFocusMode(newMode);
    setFocusPoint(null);
    toast.info(newMode === 'auto' ? 'Mise au point automatique' : 'Mise au point manuelle — touchez pour faire le point');
  }, [focusMode, supportsFocus]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const switchCamera = () => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // If using digital zoom (no native zoom), crop the center of the frame
    const useDigitalCrop = !supportsNativeZoom && zoomLevel > 1;
    const srcW = useDigitalCrop ? video.videoWidth / zoomLevel : video.videoWidth;
    const srcH = useDigitalCrop ? video.videoHeight / zoomLevel : video.videoHeight;
    const srcX = useDigitalCrop ? (video.videoWidth - srcW) / 2 : 0;
    const srcY = useDigitalCrop ? (video.videoHeight - srcH) / 2 : 0;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    setAnimalResult(null);
    setSaved(false);

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

    // Identify — compress image before sending to AI
    setIdentifying(true);
    try {
      const compressedUrl = await compressForAI(dataUrl, 1024, 0.6);
      const { data, error } = await supabase.functions.invoke('identify-animal', {
        body: { imageBase64: compressedUrl },
      });
      if (error) throw error;
      if (data?.success && data.animal) {
        if (data.animal.animal_name === 'Inconnu' || data.animal.animal_name.toLowerCase() === 'inconnu') {
            setManualMode(true);
          } else {
            triggerReveal(data.animal);
          }
      } else {
        setManualMode(true);
      }
    } catch (err: any) {
      console.error(err);
      setManualMode(true);
    } finally {
      setIdentifying(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Sélectionne une image');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setCapturedPhoto(dataUrl);
      setAnimalResult(null);
      setSaved(false);

      // Grab GPS location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setGeoCoords(coords);
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
          () => { setGeoCoords(null); setGeoName(null); },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }

      // Identify
      setIdentifying(true);
      try {
        const compressedUrl = await compressForAI(dataUrl, 1024, 0.6);
        const { data, error } = await supabase.functions.invoke('identify-animal', {
          body: { imageBase64: compressedUrl },
        });
        if (error) throw error;
        if (data?.success && data.animal) {
          if (data.animal.animal_name === 'Inconnu' || data.animal.animal_name.toLowerCase() === 'inconnu') {
            setManualMode(true);
          } else {
            triggerReveal(data.animal);
          }
        } else {
          setManualMode(true);
        }
      } catch (err: any) {
        console.error(err);
        setManualMode(true);
      } finally {
        setIdentifying(false);
      }
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const resetCapture = () => {
    setCapturedPhoto(null);
    setAnimalResult(null);
    setSaved(false);
    setDuplicateCapture(null);
    setGeoCoords(null);
    setGeoName(null);
    setManualMode(false);
    setManualName('');
    setManualSpecies('');
    setManualDescription('');
    setZoomLevel(1);
    setFocusPoint(null);
    setFocusMode('auto');
    setRevealPhase('idle');
  };

  const REVEAL_TIMINGS: Record<Rarity, { freeze: number; shake: number; burst: number }> = {
    common: { freeze: 500, shake: 400, burst: 500 },
    rare: { freeze: 700, shake: 600, burst: 700 },
    epic: { freeze: 900, shake: 900, burst: 900 },
    mythic: { freeze: 1200, shake: 1200, burst: 1100 },
  };

  const triggerReveal = (animal: AnimalResult) => {
    const rarity = animal.rarity as Rarity;
    setRevealRarity(rarity);
    const t = REVEAL_TIMINGS[rarity];

    // Phase 0: freeze — white flash + frozen image
    setFreezeFlash(true);
    setRevealPhase('freeze');
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(rarity === 'mythic' ? [50, 30, 50, 30, 80] : rarity === 'epic' ? [40, 20, 60] : [30]);
    }
    setTimeout(() => setFreezeFlash(false), 150);

    setTimeout(() => {
      // Phase 1: shaking with suspense
      setRevealPhase('shaking');

      setTimeout(() => {
        // Phase 2: burst reveal
        setRevealPhase('burst');
        setAnimalResult(animal);
        // Haptic on reveal
        if (navigator.vibrate) {
          navigator.vibrate(rarity === 'mythic' ? [100, 50, 100, 50, 200] : rarity === 'epic' ? [80, 40, 120] : rarity === 'rare' ? [60, 30, 80] : [40]);
        }

        setTimeout(() => {
          setRevealPhase('done');
        }, t.burst);
      }, t.shake);
    }, t.freeze);
  };

  const saveManualEntry = async () => {
    if (!capturedPhoto || !session?.user) return;
    const trimmedName = manualName.trim();
    const trimmedSpecies = manualSpecies.trim();
    const trimmedDesc = manualDescription.trim();
    if (!trimmedName || !trimmedDesc) {
      toast.error('Remplis au moins le nom et la description');
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
        scientific_name: trimmedSpecies || null,
        category: null,
        description: trimmedDesc,
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
      setTimeout(() => navigate('/home'), 1500);
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

  // Level-up is now handled by the LevelUpCelebration overlay via realtime
  // No need for manual checkLevelUp anymore

  const doSaveNew = async () => {
    if (!capturedPhoto || !animalResult || !session?.user) return;
    setSaving(true);
    try {
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
      setPendingShelve({
        animalName: animalResult.animal_name,
        category: animalResult.category,
        rarity: animalResult.rarity,
        imageUrl,
      });
      setTimeout(() => navigate('/bestiaire'), 900);
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
          shared: false,
          caption: null,
          location: geoName || null,
          latitude: geoCoords?.lat || null,
          longitude: geoCoords?.lng || null,
        })
        .eq('id', duplicateCapture.id);
      if (updateError) throw updateError;

      setSaved(true);
      setDuplicateCapture(null);
      toast.success(`${animalResult.animal_name} mis à jour dans ton Faunex !`);
      setPendingShelve({
        animalName: animalResult.animal_name,
        category: animalResult.category,
        rarity: animalResult.rarity,
        imageUrl,
      });
      setTimeout(() => navigate('/bestiaire'), 900);
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
          {capturedPhoto ? (
            <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay playsInline muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                style={!supportsNativeZoom && zoomLevel > 1 ? { transform: `${facingMode === 'user' ? 'scaleX(-1) ' : ''}scale(${zoomLevel})`, transformOrigin: 'center center' } : undefined}
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
              className="p-3 rounded-full bg-primary-foreground/10 text-primary-foreground/60"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {!capturedPhoto && (
              <>
                <button
                  onClick={() => setFlash(!flash)}
                  className={`p-3 rounded-full transition-colors ${flash ? 'bg-amber text-amber-dark' : 'bg-primary-foreground/10 text-primary-foreground/60'}`}
                >
                  <Zap className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleFocusMode}
                  className={`p-3 rounded-full transition-colors ${focusMode === 'manual' ? 'bg-amber text-amber-dark' : 'bg-primary-foreground/10 text-primary-foreground/60'}`}
                >
                  <Focus className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
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
              <p className="text-primary-foreground/50 font-display text-xs tracking-widest uppercase">Analyse en cours</p>
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
              <p className="text-primary-foreground/60 text-sm italic">{animalResult.scientific_name}</p>
            </div>
          </div>
        )}

        {animalResult && !identifying && revealPhase === 'done' && (
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
                Décris l'animal que tu as observé. Ta capture sera vérifiée par un modérateur avant d'être ajoutée à ton Faunex.
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
                placeholder="Nom scientifique (optionnel)"
                value={manualSpecies}
                onChange={e => setManualSpecies(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 bg-primary-foreground/10 rounded-xl text-sm text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body italic"
              />
              <textarea
                placeholder="Décris l'animal : couleur, taille, comportement, lieu d'observation…"
                value={manualDescription}
                onChange={e => setManualDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2.5 bg-primary-foreground/10 rounded-xl text-sm text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 font-body resize-none"
              />
              <p className="text-primary-foreground/40 text-[10px] text-right">{manualDescription.length}/500</p>
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
