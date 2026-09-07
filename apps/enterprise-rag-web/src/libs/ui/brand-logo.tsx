export interface BrandLogoProps {
  sizePixels?: number;
  className?: string;
}

export function BrandLogo({ sizePixels = 28, className = '' }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={sizePixels}
      height={sizePixels}
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <rect
        x="32"
        y="32"
        width="448"
        height="448"
        rx="112"
        ry="112"
        className="fill-zinc-950 dark:fill-zinc-100"
      />
      <path
        className="fill-white dark:fill-zinc-950"
        d="M 106,358 L 174,358 L 254,222 L 260,222 L 338,358 L 404,358 L 404,352 L 272,130 L 266,126 L 246,126 L 106,352 Z"
      />
      <path
        className="fill-white dark:fill-zinc-950"
        d="M 256,302 Q 254,338 214,342 Q 254,346 256,384 Q 258,346 298,342 Q 258,338 256,302 Z"
      />
    </svg>
  );
}
