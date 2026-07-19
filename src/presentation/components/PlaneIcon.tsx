interface PlaneIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const TAMANOS = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export function PlaneIcon({ className = '', size = 'md' }: PlaneIconProps) {
  return (
    <svg
      className={`${TAMANOS[size]} ${className}`}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}
