type LogoMarkProps = {
  size?: number;
  className?: string;
};

/** Biểu tượng Góp Mầm: mầm non và hạt trên nền tròn đỏ san hô (trùng với app/icon.svg). */
export function LogoMark({ size = 40, className }: LogoMarkProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="32" fill="var(--primary)" />
      <path d="M32 50V32" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M30.5 35C30.5 25 23 19 13 20C13 30 20.5 36 30.5 35Z" fill="#fff" />
      <path d="M33.5 30C33.5 19.5 40.5 13 51 14C51 24.5 44 31 33.5 30Z" fill="#fff" />
      <circle cx="32" cy="9.5" r="3.5" fill="#fff" />
    </svg>
  );
}
