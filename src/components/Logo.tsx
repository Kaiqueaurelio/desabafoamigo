import logo128 from "@/assets/logo-128.webp";
import logo256 from "@/assets/logo-256.webp";
import logo384 from "@/assets/logo-384.webp";
import logo128Png from "@/assets/logo-128.png";
import logo256Png from "@/assets/logo-256.png";
import logo384Png from "@/assets/logo-384.png";

const webpSrcSet = `${logo128} 1x, ${logo256} 2x, ${logo384} 3x`;
const pngSrcSet = `${logo128Png} 1x, ${logo256Png} 2x, ${logo384Png} 3x`;

export function Logo({
  size,
  className,
  responsive = false,
  alt = "Desabafa Amigo — ir para a página inicial",
  decorative = false,
  priority = false,
}: {
  size?: number;
  className?: string;
  /** When true, ignores size prop and relies on className (h-/w- utilities) for responsive sizing. */
  responsive?: boolean;
  /** Accessible label. Override when the logo appears next to visible brand text. */
  alt?: string;
  /** Set true when a sibling visible text already announces the brand — image becomes decorative. */
  decorative?: boolean;
  /** Above-the-fold usage (e.g. header) — hints the browser to load eagerly with high priority. */
  priority?: boolean;
}) {
  const dims = responsive ? {} : { width: size ?? 56, height: size ?? 56 };
  const a11y = decorative
    ? { alt: "", "aria-hidden": true as const, role: "presentation" as const }
    : { alt };
  const loading = priority ? ("eager" as const) : ("lazy" as const);
  const fetchPriority = priority ? "high" : "auto";

  return (
    <picture>
      <source type="image/webp" srcSet={webpSrcSet} />
      <img
        src={logo128Png}
        srcSet={pngSrcSet}
        {...dims}
        {...a11y}
        loading={loading}
        // @ts-expect-error — fetchpriority is a valid HTML attribute not yet in React types
        fetchpriority={fetchPriority}
        decoding="async"
        draggable={false}
        className={className}
        style={{ objectFit: "contain" }}
      />
    </picture>
  );
}
