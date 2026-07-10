// Deterministic avatar URL from a seed (display name). No account creation, no upload.
// Uses Dicebear "thumbs" style — soft, friendly shapes matching a calm brand.
export function avatarUrl(seed: string | null | undefined, size = 96): string {
  const s = (seed && seed.trim()) || "amigo";
  const params = new URLSearchParams({
    seed: s,
    size: String(size),
    backgroundType: "gradientLinear",
    backgroundColor: "b6e3f4,c0aede,ffdfbf,d1f4d1",
  });
  return `https://api.dicebear.com/9.x/thumbs/svg?${params.toString()}`;
}
