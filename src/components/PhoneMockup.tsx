import { ReactNode } from 'react';

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
}

/**
 * iPhone-style mockup frame. Children render inside the screen area.
 */
const PhoneMockup = ({ children, className = '' }: PhoneMockupProps) => {
  return (
    <div className={`relative mx-auto ${className}`}>
      {/* Outer frame */}
      <div className="relative rounded-[2.2rem] bg-gradient-to-b from-neutral-900 to-neutral-800 p-[6px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5),0_8px_20px_-8px_rgba(0,0,0,0.3)] ring-1 ring-black/20">
        {/* Inner bezel */}
        <div className="relative rounded-[1.9rem] overflow-hidden bg-background aspect-[9/19.5]">
          {/* Notch / Dynamic Island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 h-5 w-20 rounded-full bg-black" />
          {/* Status bar spacer */}
          <div className="h-7" />
          {/* Screen content */}
          <div className="relative h-[calc(100%-1.75rem)] overflow-hidden">{children}</div>
        </div>
      </div>
      {/* Side buttons */}
      <div className="absolute top-20 -left-[2px] h-10 w-[3px] rounded-l bg-neutral-700" />
      <div className="absolute top-32 -left-[2px] h-14 w-[3px] rounded-l bg-neutral-700" />
      <div className="absolute top-24 -right-[2px] h-20 w-[3px] rounded-r bg-neutral-700" />
    </div>
  );
};

export default PhoneMockup;
