import { useTranslation } from 'react-i18next';

const LandingPhoneShowcase = () => {
  const { t } = useTranslation();

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

        <div className="mx-auto w-full max-w-[1080px]">
          <img
            src="/landing/faunex-app-mockups.webp"
            alt={t('marketing.phoneShowcase.captureAlt')}
            className="h-auto w-full object-contain"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
};

export default LandingPhoneShowcase;