import Image from "next/image";

export function BrandSymbol({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/brand/desmos-symbol.png"
      width={size}
      height={size}
      alt=""
      className="brand-symbol"
      unoptimized
    />
  );
}
