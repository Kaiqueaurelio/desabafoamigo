import logo from "@/assets/logo.png";

export function Logo({
  size,
  className,
  responsive = false,
}: {
  size?: number;
  className?: string;
  /** When true, ignores size prop and relies on className (h- and w- utilities) for responsive sizing. */
  responsive?: boolean;
}) {
  if (responsive) {
    return (
      <img
        src={logo}
        alt="Desabafa Amigo"
        className={className}
        style={{ objectFit: "contain" }}
      />
    );
  }
  const s = size ?? 56;
  return (
    <img
      src={logo}
      alt="Desabafa Amigo"
      width={s}
      height={s}
      className={className}
    />
  );
}
