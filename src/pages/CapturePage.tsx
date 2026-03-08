import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Zap, MapPin, Image, SwitchCamera, X } from 'lucide-react';
import { toast } from 'sonner';

const CapturePage = () => {
  const [flash, setFlash] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [lastThumbnail, setLastThumbnail] = useState<string | null>(null);
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
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      toast.error("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const takePhoto = () => {
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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);
    setLastThumbnail(dataUrl);
    toast.success('Photo capturée !');
  };

  const dismissPhoto = () => setCapturedPhoto(null);

  const downloadPhoto = () => {
    if (!capturedPhoto) return;
    const link = document.createElement('a');
    link.href = capturedPhoto;
    link.download = `faunex-${Date.now()}.jpg`;
    link.click();
    dismissPhoto();
  };

  return (
    <main className="min-h-screen bg-foreground flex flex-col pb-24">
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera feed / captured photo */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {capturedPhoto ? (
          <img src={capturedPhoto} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
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

        {/* Viewfinder overlay (only when camera active, no captured photo) */}
        {!capturedPhoto && cameraActive && (
          <div className="relative z-10 w-72 h-72 border-2 border-primary-foreground/30 rounded-3xl pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-2xl -translate-x-px -translate-y-px" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-2xl translate-x-px -translate-y-px" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-2xl -translate-x-px translate-y-px" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-2xl translate-x-px translate-y-px" />
          </div>
        )}

        {/* Top controls */}
        <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-6 z-20">
          {capturedPhoto ? (
            <button onClick={dismissPhoto} className="p-3 rounded-full bg-primary-foreground/10 text-primary-foreground/60">
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
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 flex items-center justify-center gap-8 py-8 px-6">
        {capturedPhoto ? (
          <>
            <button onClick={dismissPhoto} className="px-6 py-3 rounded-xl bg-primary-foreground/10 text-primary-foreground/70 font-display text-sm">
              Reprendre
            </button>
            <button onClick={downloadPhoto} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display text-sm">
              Sauvegarder
            </button>
          </>
        ) : (
          <>
            {/* Thumbnail of last photo */}
            <button className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center overflow-hidden">
              {lastThumbnail ? (
                <img src={lastThumbnail} alt="Last" className="w-full h-full object-cover" />
              ) : (
                <Image className="w-5 h-5 text-primary-foreground/60" />
              )}
            </button>

            {/* Shutter */}
            <button
              onClick={takePhoto}
              className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center group active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full bg-primary group-hover:bg-forest-light transition-colors flex items-center justify-center">
                <Camera className="w-7 h-7 text-primary-foreground" />
              </div>
            </button>

            {/* Switch camera */}
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
