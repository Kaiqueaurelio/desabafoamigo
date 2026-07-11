import logo from "@/assets/logo.png";

export function Logo({
  size,
  className,
  responsive = false,
}: {
  size?: number;
  className?: string;
  /** When true, ignores `size` and relies on className (h-*/w-*) for sizing across breakpoints. */
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
