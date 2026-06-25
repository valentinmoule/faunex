interface FrogIconProps {
  className?: string;
  strokeWidth?: number;
}

export const FrogIcon = ({ className, strokeWidth = 2 }: FrogIconProps) => (
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
    <ellipse cx="12" cy="14" rx="7" ry="5" />
    <circle cx="9" cy="11" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="11" r="1.5" fill="currentColor" stroke="none" />
    <path d="M9.5 16c1.5 1 3.5 1 5 0" />
    <path d="M5 12c-2-1-3-3-2-4s3 0 4 2" />
    <path d="M19 12c2-1 3-3 2-4s-3 0-4 2" />
  </svg>
);
