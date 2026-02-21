import { useState } from 'react';
import { Camera, Zap, MapPin, Image } from 'lucide-react';

const CapturePage = () => {
  const [flash, setFlash] = useState(false);

  return (
    <main className="min-h-screen bg-foreground flex flex-col pb-24">
      {/* Simulated camera viewfinder */}
      <div className="flex-1 relative flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/90 via-foreground/70 to-foreground/90" />
        
        {/* Viewfinder frame */}
        <div className="relative z-10 w-72 h-72 border-2 border-primary-foreground/30 rounded-3xl flex items-center justify-center">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-2xl -translate-x-px -translate-y-px" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-2xl translate-x-px -translate-y-px" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-2xl -translate-x-px translate-y-px" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-2xl translate-x-px translate-y-px" />
          
          <div className="text-center">
            <Camera className="w-12 h-12 text-primary-foreground/40 mx-auto mb-3" />
            <p className="text-primary-foreground/50 text-sm font-display">Cadrez l'animal</p>
            <p className="text-primary-foreground/30 text-xs mt-1">L'IA identifiera l'espèce</p>
          </div>
        </div>

        {/* Top controls */}
        <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-6 z-20">
          <button
            onClick={() => setFlash(!flash)}
            className={`p-3 rounded-full transition-colors ${flash ? 'bg-amber text-amber-dark' : 'bg-primary-foreground/10 text-primary-foreground/60'}`}
          >
            <Zap className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-full px-3 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary-foreground/60 text-xs font-display">Localisation active</span>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 flex items-center justify-center gap-8 py-8 px-6">
        <button className="w-12 h-12 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
          <Image className="w-5 h-5 text-primary-foreground/60" />
        </button>

        <button className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center group active:scale-95 transition-transform">
          <div className="w-16 h-16 rounded-full bg-primary group-hover:bg-forest-light transition-colors flex items-center justify-center">
            <Camera className="w-7 h-7 text-primary-foreground" />
          </div>
        </button>

        <div className="w-12 h-12" />
      </div>
    </main>
  );
};

export default CapturePage;
