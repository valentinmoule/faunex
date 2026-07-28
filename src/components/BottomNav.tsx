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
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-card-hover">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-[10px] font-display font-semibold mt-1 text-primary">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 transition-colors"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
              <span
                className={`text-[10px] font-display font-semibold transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
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
