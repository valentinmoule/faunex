import { useLocation, useNavigate } from 'react-router-dom';
import { CollectionIcon, TerrainIcon, CaptureIcon, ExplorersIcon, ChallengesIcon, type NavIconProps } from '@/components/nav/NavIcons';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { hapticTap } from '@/lib/haptics';

type NavTab = { path: string; labelKey: string; icon: ComponentType<NavIconProps>; tab?: string };

const tabs: NavTab[] = [
  { path: '/home', labelKey: 'nav.collection', icon: CollectionIcon },
  { path: '/home', labelKey: 'nav.terrain', icon: TerrainIcon, tab: 'map' },
  { path: '/capture', labelKey: 'nav.capture', icon: CaptureIcon },
  { path: '/explorers', labelKey: 'nav.explorers', icon: ExplorersIcon },
  { path: '/defis', labelKey: 'nav.challenges', icon: ChallengesIcon },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const currentTabParam = new URLSearchParams(location.search).get('tab');

  const isActive = (tab: (typeof tabs)[number]) => {
    const p = location.pathname;
    if (tab.labelKey === 'nav.terrain') return p === '/home' && currentTabParam === 'map';
    if (tab.labelKey === 'nav.collection') {
      return p === '/home' && currentTabParam !== 'map' && currentTabParam !== 'leaderboard';
    }
    if (tab.path === '/explorers') return p === '/explorers' || false;
    if (tab.path === '/defis') return p === '/defis' || p === '/apprendre';
    return p === tab.path;
  };

  const go = (tab: (typeof tabs)[number]) => {
    const target = tab.tab ? `${tab.path}?tab=${tab.tab}` : tab.path;
    if (location.pathname + location.search !== target) hapticTap();
    navigate(target);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/75 backdrop-blur-2xl backdrop-saturate-150 border-t border-border/60 safe-bottom" style={{ WebkitTransform: 'translate3d(0,0,0)', transform: 'translate3d(0,0,0)' }}>
      <div className="flex items-center justify-around h-[60px] max-w-lg mx-auto px-2">

        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          const isCapture = tab.path === '/capture';

          if (isCapture) {
            return (
              <button
                key={tab.labelKey}
                onClick={() => go(tab)}
                aria-label={t(tab.labelKey)}
                className="flex flex-col items-center justify-center -mt-[43px] press"
              >
                <div className="capture-halo w-[54px] h-[54px] rounded-[20px] bg-gradient-to-b from-forest-light to-primary flex items-center justify-center shadow-[0_2px_4px_hsla(165,25%,11%,0.08),0_12px_28px_-10px_hsl(var(--primary)/0.65)] ring-4 ring-card">
                  <Icon active className="w-7 h-7 text-primary-foreground" />
                </div>
              </button>
            );
          }

          return (
            <button
              key={tab.labelKey}
              onClick={() => go(tab)}
              className="relative flex flex-col items-center justify-center gap-1 py-2 px-3 press"
            >
              <Icon
                key={`${tab.labelKey}-${active ? 'on' : 'off'}`}
                active={active}
                className={`w-[26px] h-[26px] transition-colors duration-200 ${
                  active ? 'text-primary tab-pop' : 'text-muted-foreground'
                }`}
              />
              <span
                className={`text-[10px] font-display tracking-tight transition-colors duration-200 ${
                  active ? 'text-primary font-bold' : 'text-muted-foreground font-medium'
                }`}
              >
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
