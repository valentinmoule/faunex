import { type SVGProps } from 'react';

export const AppStoreBadge = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="120" height="40" rx="6" fill="currentColor" className="text-foreground" />
    <path
      d="M22.5 18.8c-.2-1.1.3-2.2 1.1-2.9l.1-.1c-1.4-1.9-3.6-2.1-4.4-2.1-1.9 0-3.7 1.1-4.7 1.1-1 0-2.5-1.1-4.1-1.1-2.1 0-4 1.2-5.1 3.1-2.2 3.8-.6 9.4 1.6 12.5 1 1.5 2.3 3.2 3.9 3.1 1.6-.1 2.2-1 4.1-1 1.9 0 2.4 1 4.1 1 1.7 0 2.8-1.5 3.9-3.1 1.2-1.8 1.7-3.6 1.8-3.7-.1-.1-3.4-1.3-3.4-5.1-.1-3.2 2.7-4.7 2.8-4.8-.1-.2-1.3-2.6-3.8-2.9z"
      fill="currentColor"
      className="text-background"
    />
    <path d="M17.5 10.2c.9-1.1 1.5-2.5 1.3-4-1.2.1-2.7.8-3.5 1.9-.8.9-1.5 2.4-1.3 3.8 1.4.1 2.6-.7 3.5-1.7z" fill="currentColor" className="text-background" />
    <text x="38" y="17" fill="currentColor" className="text-background" fontSize="7" fontFamily="system-ui, sans-serif">Disponible sur</text>
    <text x="38" y="30" fill="currentColor" className="text-background" fontSize="12" fontWeight="600" fontFamily="system-ui, sans-serif">App Store</text>
  </svg>
);

export const PlayStoreBadge = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="120" height="40" rx="6" fill="currentColor" className="text-foreground" />
    <path d="M10.5 12.5v15l12.5-7.5-12.5-7.5z" fill="currentColor" className="text-background" />
    <path d="M10.5 12.5l12.5 7.5 4-2.4L14.5 10.2c-1.8-1-4 .3-4 2.3z" fill="currentColor" className="text-background/90" />
    <path d="M10.5 27.5c0 2 2.2 3.3 4 2.3l12.5-7.4-4-2.4-12.5 7.5z" fill="currentColor" className="text-background/90" />
    <text x="38" y="17" fill="currentColor" className="text-background" fontSize="7" fontFamily="system-ui, sans-serif">Disponible sur</text>
    <text x="38" y="30" fill="currentColor" className="text-background" fontSize="12" fontWeight="600" fontFamily="system-ui, sans-serif">Google Play</text>
  </svg>
);
