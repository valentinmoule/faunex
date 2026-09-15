import { ReactNode } from 'react';

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
  /** 'light' — white bezel, soft shadow. 'dark' — black bezel with glow shadow. */
  variant?: 'light' | 'dark';
}

/**
 * iPhone-style mockup frame. Children render inside the screen area.
 */
const PhoneMockup = ({ children, className = '', variant = 'light' }: PhoneMockupProps) => {
  if (variant === 'dark') {
    return (
      <div className={`relative mx-auto ${className}`}>
        <div className="relative rounded-[2.8rem] bg-gradient-to-b from-neutral-900 to-neutral-950 p-2.5 shadow-[0_40px_80px_-24px_rgba(16,80,40,0.45)] ring-1 ring-white/10">
          <div className="relative rounded-[2.2rem] overflow-hidden aspect-[9/19]">
            {/* Dynamic island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 h-5 w-20 rounded-full bg-black" />
            {children}
          </div>
        </div>
        {/* Side buttons */}
        <div className="absolute top-24 -left-[2px] h-10 w-[3px] rounded-l bg-neutral-700" />
        <div className="absolute top-36 -left-[2px] h-14 w-[3px] rounded-l bg-neutral-700" />
        <div className="absolute top-28 -right-[2px] h-20 w-[3px] rounded-r bg-neutral-700" />
      </div>
    );
  }

  return (
    <div className={`relative mx-auto ${className}`}>
      {/* Outer frame — white bezel, premium floating shadow */}
      <div className="relative rounded-[2.8rem] bg-white p-2.5 shadow-[0_40px_80px_-28px_rgba(0,0,0,0.28)] ring-1 ring-black/10">
        <div className="relative rounded-[2.2rem] overflow-hidden bg-muted aspect-[9/19]">
          {/* Dynamic island */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 h-5 w-20 rounded-full bg-black" />
          {children}
        </div>
      </div>
      {/* Side buttons */}
      <div className="absolute top-24 -left-[2px] h-10 w-[3px] rounded-l bg-neutral-300" />
      <div className="absolute top-36 -left-[2px] h-14 w-[3px] rounded-l bg-neutral-300" />
      <div className="absolute top-28 -right-[2px] h-20 w-[3px] rounded-r bg-neutral-300" />
    </div>
  );
};

export default PhoneMockup;
