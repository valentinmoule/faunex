interface SpiderIconProps {
  className?: string;
  strokeWidth?: number | string;
}

/** Araignée — distincte de l'icône insecte (Bug) de lucide. */
export const SpiderIcon = ({ className, strokeWidth = 2 }: SpiderIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <ellipse cx="12" cy="13.5" rx="3.5" ry="4" />
    <circle cx="12" cy="8" r="2" />
    <path d="M8.5 11 5 8.5 3.5 5" />
    <path d="M15.5 11 19 8.5 20.5 5" />
    <path d="M8.5 13.5H4.5L2.5 11" />
    <path d="M15.5 13.5h4l2-2.5" />
    <path d="M9 16.5 6 19l-.5 2.5" />
    <path d="M15 16.5 18 19l.5 2.5" />
  </svg>
);
