import { useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from 'react';
import { toast } from 'sonner';

interface UseCameraOptions {
  /** When true (e.g. a photo is being reviewed) gestures are ignored. */
  paused: boolean;
}

/**
 * Encapsulates all MediaStream concerns: stream lifecycle, facing mode,
 * torch, zoom (native + digital), tap-to-focus and frame grabbing.
 */
export const useCamera = ({ paused }: UseCameraOptions) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartZoom = useRef<number>(1);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flash, setFlash] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(5);
  const [supportsNativeZoom, setSupportsNativeZoom] = useState(false);
  const [focusMode, setFocusMode] = useState<'auto' | 'manual'>('auto');
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [focusAnimating, setFocusAnimating] = useState(false);
  const [supportsFocus, setSupportsFocus] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      stopCamera();

      // On demande la meilleure résolution disponible, avec des paliers de repli :
      // certains appareils refusent une contrainte trop haute et renvoient une
      // erreur plutôt que de dégrader → preview très basse définition (flou).
      const tiers: MediaTrackConstraints[] = [
        { facingMode, width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30 } },
        { facingMode, width: { ideal: 2560 }, height: { ideal: 1440 } },
        { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        { facingMode },
      ];

      let stream: MediaStream | null = null;
      for (const video of tiers) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
          break;
        } catch {
          stream = null;
        }
      }
      if (!stream) throw new Error('no-stream');
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;

      // Si la piste obtenue est plus basse que ce que le capteur sait faire, on
      // remonte à son maximum (cas fréquent sur Android/WebView).
      const settings = track.getSettings?.() as any;
      const maxW = capabilities?.width?.max;
      const maxH = capabilities?.height?.max;
      if (maxW && maxH && settings?.width && settings.width < Math.min(maxW, 3840)) {
        try {
          await track.applyConstraints({
            width: { ideal: Math.min(maxW, 3840) },
            height: { ideal: Math.min(maxH, 2160) },
          });
        } catch {}
      }

      if (capabilities?.zoom) {
        setSupportsNativeZoom(true);
        setMaxZoom(Math.min(capabilities.zoom.max, 10));
      } else {
        setSupportsNativeZoom(false);
        setMaxZoom(5);
      }
      setZoomLevel(1);

      const focusModes: string[] = capabilities?.focusMode ?? [];
      setSupportsFocus(focusModes.length > 0);

      // Autofocus continu + expo/balance des blancs automatiques : sans ça la
      // mise au point reste bloquée sur l'arrière-plan et la photo sort floue.
      const advanced: any[] = [];
      if (focusModes.includes('continuous')) advanced.push({ focusMode: 'continuous' });
      else if (focusModes.includes('single-shot')) advanced.push({ focusMode: 'single-shot' });
      if ((capabilities?.exposureMode ?? []).includes('continuous'))
        advanced.push({ exposureMode: 'continuous' });
      if ((capabilities?.whiteBalanceMode ?? []).includes('continuous'))
        advanced.push({ whiteBalanceMode: 'continuous' });
      if (advanced.length) {
        try {
          await track.applyConstraints({ advanced } as any);
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

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  /**
   * iOS/Android suspendent (ou tuent) la piste vidéo quand l'app passe en
   * arrière-plan ou quand la page est mise en cache. Sans ça, au retour sur
   * l'écran de capture la preview restait figée : la photo suivante était un
   * frame mort et l'analyse ne partait jamais.
   */
  useEffect(() => {
    const ensureLive = () => {
      if (document.visibilityState !== 'visible') return;
      const live = streamRef.current?.getVideoTracks().some((t) => t.readyState === 'live');
      if (!live) {
        startCamera();
        return;
      }
      const video = videoRef.current;
      if (video) {
        if (video.srcObject !== streamRef.current) video.srcObject = streamRef.current;
        if (video.paused) video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', ensureLive);
    window.addEventListener('pageshow', ensureLive);
    window.addEventListener('focus', ensureLive);
    return () => {
      document.removeEventListener('visibilitychange', ensureLive);
      window.removeEventListener('pageshow', ensureLive);
      window.removeEventListener('focus', ensureLive);
    };
  }, [startCamera]);


  // Toggle torch on the active camera track
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

  const applyZoom = useCallback(
    (newZoom: number) => {
      const clamped = Math.max(1, Math.min(newZoom, maxZoom));
      setZoomLevel(clamped);
      if (supportsNativeZoom && streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        try {
          (track as any).applyConstraints({ advanced: [{ zoom: clamped } as any] });
        } catch {}
      }
    },
    [maxZoom, supportsNativeZoom]
  );

  const getDistance = (touches: globalThis.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDistance.current = getDistance(e.nativeEvent.touches);
        pinchStartZoom.current = zoomLevel;
      }
    },
    [zoomLevel]
  );

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistance.current !== null) {
        e.preventDefault();
        const currentDistance = getDistance(e.nativeEvent.touches);
        applyZoom(pinchStartZoom.current * (currentDistance / pinchStartDistance.current));
      }
    },
    [applyZoom]
  );

  const handleTouchEnd = useCallback(() => {
    pinchStartDistance.current = null;
  }, []);

  const handleTapToFocus = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (paused || !cameraActive || !streamRef.current) return;

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setFocusPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setFocusAnimating(true);
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = setTimeout(() => {
        setFocusAnimating(false);
        setTimeout(() => setFocusPoint(null), 300);
      }, 1000);

      if (supportsFocus) {
        const track = streamRef.current.getVideoTracks()[0];
        const modes: string[] = (track.getCapabilities?.() as any)?.focusMode ?? [];
        // On vise le point touché puis on rend la main à l'autofocus continu :
        // rester en 'manual' figeait la mise au point et rendait les photos floues.
        const pointMode = modes.includes('single-shot')
          ? 'single-shot'
          : modes.includes('continuous')
            ? 'continuous'
            : 'manual';
        try {
          (track as any).applyConstraints({
            advanced: [{ focusMode: pointMode, pointsOfInterest: [{ x, y }] }],
          } as any);
          if (modes.includes('continuous') && pointMode === 'single-shot') {
            setTimeout(() => {
              try {
                (track as any).applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as any);
              } catch {}
            }, 1200);
          }
        } catch {}
      }
    },
    [paused, cameraActive, supportsFocus]
  );

  const toggleFocusMode = useCallback(() => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    const newMode = focusMode === 'auto' ? 'manual' : 'auto';

    if (supportsFocus) {
      try {
        (track as any).applyConstraints({
          advanced: [{ focusMode: newMode === 'auto' ? 'continuous' : 'manual' } as any],
        });
      } catch {}
    }

    setFocusMode(newMode);
    setFocusPoint(null);
    toast.info(
      newMode === 'auto'
        ? 'Mise au point automatique'
        : 'Mise au point manuelle — touchez pour faire le point'
    );
  }, [focusMode, supportsFocus]);

  const switchCamera = useCallback(
    () => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment')),
    []
  );

  /** Grabs the current video frame as a JPEG dataURL (handles digital zoom + mirroring). */
  const grabFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Piste morte ou frame non encore décodé : on relance la caméra plutôt que
    // de produire une image vide qui bloquerait l'analyse.
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
      startCamera();
      return null;
    }


    const useDigitalCrop = !supportsNativeZoom && zoomLevel > 1;
    const srcW = useDigitalCrop ? video.videoWidth / zoomLevel : video.videoWidth;
    const srcH = useDigitalCrop ? video.videoHeight / zoomLevel : video.videoHeight;
    const srcX = useDigitalCrop ? (video.videoWidth - srcW) / 2 : 0;
    const srcY = useDigitalCrop ? (video.videoHeight - srcH) / 2 : 0;

    // En zoom numérique on garde la taille du crop (pas d'upscale flou).
    canvas.width = Math.round(srcW);
    canvas.height = Math.round(srcH);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.94);
  }, [facingMode, supportsNativeZoom, zoomLevel, startCamera]);

  /** Restores camera state after a capture is discarded. */
  const resumePreview = useCallback(() => {
    setZoomLevel(1);
    setFocusPoint(null);
    setFocusMode('auto');

    const stream = streamRef.current;
    const liveTrack = stream?.getVideoTracks().find((t) => t.readyState === 'live');
    if (!stream || !liveTrack) {
      startCamera();
    } else if (videoRef.current) {
      if (videoRef.current.srcObject !== stream) videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [startCamera]);

  return {
    videoRef,
    canvasRef,
    cameraActive,
    facingMode,
    switchCamera,
    flash,
    setFlash,
    zoomLevel,
    maxZoom,
    supportsNativeZoom,
    applyZoom,
    focusMode,
    focusPoint,
    focusAnimating,
    toggleFocusMode,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTapToFocus,
    grabFrame,
    resumePreview,
  };
};
