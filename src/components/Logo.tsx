import logo from "@/assets/logo.png";

export function Logo({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <img
      src={logo}
      alt="Desabafa Amigo"
      width={size}
      height={size}
      className={className}
    />
  );
}
