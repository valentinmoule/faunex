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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;

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

      const hasFocusMode = !!capabilities?.focusMode;
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

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

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
        try {
          (track as any).applyConstraints({
            advanced: [{ focusMode: 'manual', pointsOfInterest: [{ x, y }] }],
          } as any);
          setFocusMode('manual');
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

    const useDigitalCrop = !supportsNativeZoom && zoomLevel > 1;
    const srcW = useDigitalCrop ? video.videoWidth / zoomLevel : video.videoWidth;
    const srcH = useDigitalCrop ? video.videoHeight / zoomLevel : video.videoHeight;
    const srcX = useDigitalCrop ? (video.videoWidth - srcW) / 2 : 0;
    const srcY = useDigitalCrop ? (video.videoHeight - srcH) / 2 : 0;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, [facingMode, supportsNativeZoom, zoomLevel]);

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
