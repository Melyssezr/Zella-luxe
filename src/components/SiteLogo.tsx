import Image from "next/image";
import Link from "next/link";
import { siteAssets } from "@/lib/images";

const circleSizes = {
  header: 44,
  footer: 52,
  admin: 48,
} as const;

type SiteLogoProps = {
  variant?: keyof typeof circleSizes;
  linked?: boolean;
  showText?: boolean;
  className?: string;
};

function LogoCircle({ size }: { size: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border border-[#c9a86c]/45 bg-black shadow-[0_4px_16px_rgba(89,58,30,0.22)]"
      style={{ width: size, height: size }}
    >
      <Image
        src={siteAssets.logo}
        alt=""
        fill
        className="scale-[1.35] object-cover object-[50%_18%]"
        sizes={`${size}px`}
        priority={size === circleSizes.header}
      />
    </div>
  );
}

export function SiteLogo({
  variant = "header",
  linked = true,
  showText = variant === "header",
  className = "",
}: SiteLogoProps) {
  const size = circleSizes[variant];

  const content = (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <LogoCircle size={size} />
      {showText && (
        <span className="hidden min-w-0 flex-col sm:flex">
          <span className={`font-display text-lg font-medium leading-tight tracking-[0.18em] sm:text-xl ${
            variant === "admin" ? "text-[#e8dcbf]" : "text-[#4d3525]"
          }`}>
            ZELLA LUXE
          </span>
        </span>
      )}
    </span>
  );

  if (linked) {
    return (
      <Link href="/" className="group shrink-0 transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
