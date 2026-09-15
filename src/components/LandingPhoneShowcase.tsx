import {
  Camera,
  Heart,
  MapPin,
  MessageCircle,
  PawPrint,
  Search,
  Share2,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PhoneMockup from './PhoneMockup';

const LandingPhoneShowcase = () => {
  const { t } = useTranslation();

  const species = [
    { image: '/landing/ladybug.jpg', name: 'Coccinelle' },
    { image: '/landing/bluetit.jpg', name: 'Mésange bleue' },
    { image: '/landing/squirrel.jpg', name: 'Écureuil roux' },
    { image: '/landing/reddeer.jpg', name: 'Cerf élaphe' },
  ];

  return (
    <section className="overflow-hidden bg-foreground px-3 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center sm:mb-14">
          <h2 className="text-3xl font-black text-background sm:text-4xl">
            {(() => {
              const highlight = t('marketing.phoneShowcase.titleHighlight');
              const [before, after] = t('marketing.phoneShowcase.title', { highlight: '__HL__' }).split('__HL__');
              return (
                <>
                  {before}
                  <span className="font-editorial italic text-primary">{highlight}</span>
                  {after}
                </>
              );
            })()}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-background/65">
            {t('marketing.phoneShowcase.subtitle')}
          </p>
        </div>

        <div className="relative mx-auto h-[410px] w-full max-w-[920px] sm:h-[650px]">
          {/* Collection — background left */}
          <div className="absolute left-[-7%] top-10 z-0 w-[158px] -rotate-[7deg] sm:left-0 sm:top-16 sm:w-[270px]">
          <PhoneMockup className="w-full">
            <div className="absolute inset-0 bg-background px-3 pb-3 pt-9 sm:px-4 sm:pt-11">
              <div className="flex items-end justify-between">
                <p className="text-[10px] font-black text-primary sm:text-base">mon faunex</p>
                <span className="text-[5px] font-bold text-muted-foreground sm:text-[8px]">124</span>
              </div>
              <div className="mt-2 flex gap-1 rounded-full border border-border bg-muted/40 p-0.5 text-[5px] font-bold sm:mt-3 sm:text-[8px]">
                <span className="rounded-full bg-background px-2 py-1 shadow-sm">Captures</span>
                <span className="px-2 py-1 text-muted-foreground">Bestiaire</span>
              </div>
              <div className="mt-2 flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1.5 text-[5px] text-muted-foreground sm:mt-3 sm:text-[8px]">
                <Search className="h-2.5 w-2.5" />
                <span>{t('marketing.phoneShowcase.search')}</span>
              </div>
              <p className="mb-1.5 mt-2 text-[6px] font-black uppercase text-foreground sm:mt-3 sm:text-[9px]">
                {t('marketing.phoneShowcase.collect')}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {species.map((animal) => (
                  <div key={animal.image} className="relative aspect-[4/5] overflow-hidden rounded-md bg-muted sm:rounded-lg">
                    <img src={animal.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/90 to-transparent px-1.5 pb-1.5 pt-5">
                      <p className="truncate text-[5px] font-bold text-background sm:text-[8px]">{animal.name}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-around border-t border-border bg-background text-primary sm:h-10">
                <PawPrint className="h-3 w-3 sm:h-4 sm:w-4" />
                <Search className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </PhoneMockup>
          </div>

          {/* Capture — background right */}
          <div className="absolute right-[-7%] top-10 z-0 w-[158px] rotate-[7deg] sm:right-0 sm:top-16 sm:w-[270px]">
          <PhoneMockup className="w-full" variant="dark">
            <div className="absolute inset-0 bg-foreground">
              <img
                src="/landing/ladybug.jpg"
                alt={t('marketing.phoneShowcase.captureAlt')}
                className="h-[76%] w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-3 top-8 flex items-center justify-between text-background/85 sm:top-10">
                <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                <div className="h-3 w-3 rounded-full border border-background/70 sm:h-4 sm:w-4" />
                <span className="text-[5px] font-bold sm:text-[8px]">4/4</span>
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              </div>
              <div className="absolute inset-x-5 top-[42%] aspect-square rounded-xl border border-background/60" />
              <div className="absolute inset-x-0 bottom-0 flex h-[25%] items-center justify-around bg-primary/20">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary bg-primary/20 sm:h-14 sm:w-14 sm:border-4">
                  <Camera className="h-4 w-4 text-background sm:h-6 sm:w-6" />
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/10 sm:h-10 sm:w-10">
                  <Search className="h-3 w-3 text-background/70 sm:h-4 sm:w-4" />
                </div>
              </div>
            </div>
          </PhoneMockup>
          </div>

          {/* Species detail — foreground */}
          <div className="absolute left-1/2 top-0 z-20 w-[184px] -translate-x-1/2 sm:w-[310px]">
          <PhoneMockup className="w-full" variant="dark">
            <div className="absolute inset-0 bg-foreground">
              <div className="absolute right-4 top-8 z-10 text-background/80 sm:right-5 sm:top-10">
                <X className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              </div>
              <div className="mx-auto mt-9 w-[72%] overflow-hidden rounded-xl border border-primary/20 bg-primary/10 p-1.5 shadow-lg shadow-primary/10 sm:mt-12 sm:rounded-2xl sm:p-2">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg sm:rounded-xl">
                  <img
                    src="/landing/reddeer.jpg"
                    alt={t('marketing.phoneShowcase.reddeerAlt')}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/95 via-foreground/50 to-transparent px-2 pb-2 pt-8 sm:px-3 sm:pb-3 sm:pt-12">
                    <p className="text-[8px] font-black text-background sm:text-sm">{t('marketing.phoneShowcase.reddeerName')}</p>
                    <p className="text-[5px] italic text-background/70 sm:text-[8px]">Cervus elaphus</p>
                  </div>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 h-[51%] rounded-t-[1.35rem] bg-background px-3 pb-3 pt-3 text-foreground shadow-2xl sm:rounded-t-[2rem] sm:px-5 sm:pt-5">
                <div className="mb-2 flex items-center justify-center gap-4 text-muted-foreground sm:mb-3 sm:gap-6">
                  <span className="flex items-center gap-1 text-[6px] sm:text-[10px]"><Heart className="h-3 w-3 sm:h-4 sm:w-4" />3</span>
                  <span className="flex items-center gap-1 text-[6px] sm:text-[10px]"><MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />1</span>
                  <span className="flex items-center gap-1 text-[6px] font-bold sm:text-[10px]"><Share2 className="h-3 w-3 sm:h-4 sm:w-4" />Partager</span>
                </div>
                <div className="mb-2 flex justify-center gap-1 sm:mb-4 sm:gap-2">
                  <span className="rounded-full bg-rarity-blue/15 px-2 py-1 text-[5px] font-black uppercase text-rarity-blue sm:text-[8px]">Rare</span>
                  <span className="rounded-full bg-muted px-2 py-1 text-[5px] font-bold text-muted-foreground sm:text-[8px]">Mammifères</span>
                </div>
                <p className="line-clamp-4 text-center text-[5.5px] leading-relaxed text-muted-foreground sm:text-[9px] sm:leading-relaxed">
                  Le Cerf élaphe est le plus grand mammifère sauvage de nos forêts. Reconnaissable à ses bois majestueux, il vit dans les massifs boisés et les grandes clairières.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-2 sm:mt-5 sm:gap-4 sm:pt-4">
                  <div>
                    <p className="flex items-center gap-1 text-[5px] font-black uppercase text-primary sm:text-[8px]"><MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />Habitat</p>
                    <p className="mt-1 text-[5px] text-muted-foreground sm:text-[8px]">Forêts et clairières</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-[5px] font-black uppercase text-primary sm:text-[8px]"><UtensilsCrossed className="h-2.5 w-2.5 sm:h-3 sm:w-3" />Alimentation</p>
                    <p className="mt-1 text-[5px] text-muted-foreground sm:text-[8px]">Herbivore</p>
                  </div>
                </div>
              </div>
            </div>
          </PhoneMockup>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingPhoneShowcase;