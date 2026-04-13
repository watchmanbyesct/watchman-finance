import Image from "next/image";

const SRC = "/branding/watchman-by-esct.png";

const ALT =
  "Watchman by ESCT — security and finance platform logo with shield and wordmark";

type WatchmanLogoProps = {
  /** Tailwind height class; width follows aspect ratio */
  className?: string;
  priority?: boolean;
};

/**
 * Official Watchman by ESCT mark — use across login, shell chrome, and marketing surfaces.
 * Source asset: `public/branding/watchman-by-esct.png` (square 1:1).
 */
export function WatchmanLogo({ className = "h-9 w-auto", priority }: WatchmanLogoProps) {
  return (
    <Image
      src={SRC}
      alt={ALT}
      width={512}
      height={512}
      className={`object-contain object-left ${className}`}
      priority={priority}
    />
  );
}
