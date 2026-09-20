"use client";

import { InstagramIcon } from "./InstagramIcon";

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
    </svg>
  );
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type SocialItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  color: string;
};

type SocialLinksProps = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  whatsapp?: string;
  size?: number;
  className?: string;
};

const iconBase =
  "rounded-full border border-[#a07d3e]/18 bg-white/50 p-2.5 shadow-[0_3px_12px_rgba(89,58,30,0.06)] transition hover:bg-[#fffaf2] hover:shadow-[0_5px_16px_rgba(89,58,30,0.12)]";

const SOCIAL_ITEMS = [
  {
    key: "instagram" as const,
    label: "Instagram",
    color: "text-[#E4405F] hover:text-[#ff6b9d]",
    Icon: InstagramIcon,
    filled: true,
  },
  {
    key: "facebook" as const,
    label: "Facebook",
    color: "text-[#1877F2] hover:text-[#4d9bff]",
    Icon: FacebookIcon,
    filled: false,
  },
  {
    key: "tiktok" as const,
    label: "TikTok",
    color: "text-[#ff006e] hover:text-[#ff4d9a]",
    Icon: TikTokIcon,
    filled: false,
  },
  {
    key: "whatsapp" as const,
    label: "WhatsApp",
    color: "text-[#25D366] hover:text-[#4ade80]",
    Icon: WhatsAppIcon,
    filled: false,
  },
];

export function SocialLinks({
  instagram = "",
  facebook = "",
  tiktok = "",
  whatsapp = "",
  size = 20,
  className = "",
}: SocialLinksProps) {
  const urls = { instagram, facebook, tiktok, whatsapp };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {SOCIAL_ITEMS.map(({ key, label, color, Icon, filled }) => {
        const href = urls[key];
        const icon =
          key === "instagram" ? (
            <InstagramIcon size={size} filled={filled} />
          ) : (
            <Icon size={size} />
          );
        const className = `${iconBase} ${color}`;

        return href ? (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className={className}
          >
            {icon}
          </a>
        ) : (
          <span
            key={key}
            aria-label={label}
            className={`${className} cursor-default`}
            title={`${label} — bientôt disponible`}
          >
            {icon}
          </span>
        );
      })}
    </div>
  );
}
