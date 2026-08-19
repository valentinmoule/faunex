import { Crown } from "lucide-react";

interface PremiumAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  isPremium?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: { wrapper: "w-8 h-8", text: "text-[10px]", badge: "w-3.5 h-3.5", icon: "w-2 h-2" },
  md: { wrapper: "w-9 h-9", text: "text-xs", badge: "w-4 h-4", icon: "w-2 h-2" },
  lg: { wrapper: "w-11 h-11", text: "text-sm", badge: "w-5 h-5", icon: "w-2.5 h-2.5" },
  xl: { wrapper: "w-20 h-20", text: "text-3xl", badge: "w-7 h-7", icon: "w-3.5 h-3.5" },
};

export function PremiumAvatar({
  avatarUrl,
  name,
  size = "md",
  isPremium = false,
  className = "",
}: PremiumAvatarProps) {
  const s = sizeClasses[size];
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className={`${s.wrapper} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${s.wrapper} rounded-full bg-primary/20 flex items-center justify-center font-display font-bold text-primary`}
        >
          {initial}
        </div>
      )}
      {isPremium && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${s.badge} rounded-full bg-amber text-amber-foreground flex items-center justify-center ring-2 ring-card`}
          aria-label="Premium"
        >
          <Crown className={`${s.icon}`} strokeWidth={3} />
        </span>
      )}
    </div>
  );
}
