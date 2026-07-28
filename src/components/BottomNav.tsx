import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, Users, PawPrint, Map, User } from 'lucide-react';

const tabs = [
  { path: '/home', label: 'Mon Faunex', icon: PawPrint },
  { path: '/bestiaire', label: 'Cartes', icon: Map },
  { path: '/capture', label: 'Capture', icon: Camera },
  { path: '/explorers', label: 'Explorateurs', icon: Users },
  { path: '/profile', label: 'Profil', icon: User },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/75 backdrop-blur-2xl backdrop-saturate-150 border-t border-border/60 safe-bottom" style={{ WebkitTransform: 'translate3d(0,0,0)', transform: 'translate3d(0,0,0)' }}>
      <div className="flex items-center justify-around h-[60px] max-w-lg mx-auto px-2">

        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          const isCapture = tab.path === '/capture';

          if (isCapture) {
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center -mt-6 active:scale-95 transition-transform"
              >
                <div className="w-[54px] h-[54px] rounded-[20px] bg-gradient-to-b from-forest-light to-primary flex items-center justify-center shadow-[0_2px_4px_hsla(165,25%,11%,0.08),0_12px_28px_-10px_hsl(var(--primary)/0.65)] ring-4 ring-card">
                  <Icon className="w-6 h-6 text-primary-foreground" strokeWidth={2.2} />
                </div>
                <span className="text-[10px] font-display font-semibold mt-1 text-primary tracking-tight">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-1 py-2 px-3 transition-transform active:scale-95"
            >
              <Icon
                className={`w-[22px] h-[22px] transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                strokeWidth={isActive ? 2.4 : 1.9}
              />
              <span
                className={`text-[10px] font-display tracking-tight transition-colors ${
                  isActive ? 'text-primary font-bold' : 'text-muted-foreground font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
