import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "images", "categories");
mkdirSync(outDir, { recursive: true });

const BG = "#0a0a0d";
const GOLD = "#c9a86c";
const GOLD_LIGHT = "#e4cf9a";
const GOLD_DARK = "#a07d3e";

function wrap(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#14141c"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${GOLD_LIGHT}"/>
      <stop offset="45%" stop-color="${GOLD}"/>
      <stop offset="100%" stop-color="${GOLD_DARK}"/>
    </linearGradient>
    <linearGradient id="goldSoft" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${GOLD_DARK}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${GOLD_LIGHT}" stop-opacity="0.9"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="200" fill="none" stroke="${GOLD}" stroke-opacity="0.08" stroke-width="1"/>
  <circle cx="256" cy="256" r="160" fill="none" stroke="${GOLD}" stroke-opacity="0.05" stroke-width="0.5"/>
  ${content}
  <circle cx="120" cy="100" r="1.5" fill="${GOLD_LIGHT}" opacity="0.4"/>
  <circle cx="390" cy="130" r="1" fill="${GOLD}" opacity="0.35"/>
  <circle cx="420" cy="380" r="1.5" fill="${GOLD_LIGHT}" opacity="0.3"/>
  <circle cx="95" cy="350" r="1" fill="${GOLD}" opacity="0.25"/>
</svg>`;
}

/** Category silhouette paths — centered ~256,256, luxury editorial style */
const categories = {
  talons: `
    <g transform="translate(256,268) scale(1.1)" filter="url(#glow)">
      <path fill="url(#gold)" d="M-55 20 L-48 -85 Q-45 -95 -30 -98 L35 -98 Q50 -95 52 -85 L58 20 Q60 35 45 38 L-50 38 Q-58 35 -55 20 Z"/>
      <path fill="url(#goldSoft)" d="M-30 -98 L35 -98 L38 -70 L-28 -70 Z" opacity="0.5"/>
      <line x1="0" y1="-98" x2="0" y2="38" stroke="${GOLD_LIGHT}" stroke-width="0.8" opacity="0.3"/>
      <path fill="url(#gold)" d="M45 38 L52 55 Q55 62 48 65 L-48 65 Q-55 62 -52 55 L-50 38 Z"/>
    </g>`,

  escarpins: `
    <g transform="translate(256,275) scale(1.05)" filter="url(#glow)">
      <path fill="url(#gold)" d="M-70 15 Q-72 5 -60 0 L50 0 Q65 0 68 12 L75 30 Q78 40 65 42 L-65 42 Q-75 40 -70 15 Z"/>
      <path fill="url(#goldSoft)" d="M-60 0 L50 0 L45 -25 L-55 -25 Z" opacity="0.45"/>
      <path fill="url(#gold)" d="M65 42 L72 58 Q75 68 60 70 L-60 70 Q-72 68 -68 58 L-65 42 Z"/>
      <ellipse cx="0" cy="-35" rx="58" ry="12" fill="none" stroke="${GOLD_LIGHT}" stroke-width="1" opacity="0.25"/>
    </g>`,

  sandales: `
    <g transform="translate(256,270) scale(1.08)" filter="url(#glow)">
      <path fill="url(#gold)" d="M-65 25 Q-68 15 -55 10 L55 10 Q68 12 70 25 L72 40 Q74 50 60 52 L-60 52 Q-72 50 -65 25 Z"/>
      <path fill="none" stroke="url(#goldSoft)" stroke-width="3" stroke-linecap="round" d="M-40 10 L-20 -55 L20 -55 L40 10"/>
      <path fill="none" stroke="url(#goldSoft)" stroke-width="2.5" stroke-linecap="round" d="M-55 10 L-30 -30 M55 10 L30 -30"/>
      <circle cx="-20" cy="-55" r="4" fill="${GOLD_LIGHT}" opacity="0.6"/>
      <circle cx="20" cy="-55" r="4" fill="${GOLD_LIGHT}" opacity="0.6"/>
    </g>`,

  mules: `
    <g transform="translate(256,272) scale(1.06)" filter="url(#glow)">
      <path fill="url(#gold)" d="M-68 18 Q-70 8 -58 5 L55 5 Q68 8 70 20 L75 38 Q78 48 62 50 L-62 50 Q-75 48 -68 18 Z"/>
      <path fill="url(#goldSoft)" d="M-58 5 L55 5 L50 -20 L-53 -20 Z" opacity="0.4"/>
      <path fill="none" stroke="${GOLD_LIGHT}" stroke-width="2" opacity="0.35" d="M-53 -20 Q0 -45 50 -20"/>
      <path fill="url(#gold)" d="M62 50 L68 62 Q70 68 58 70 L-58 70 Q-70 68 -65 62 L-62 50 Z"/>
    </g>`,

  ballerines: `
    <g transform="translate(256,278) scale(1.1)" filter="url(#glow)">
      <path fill="url(#gold)" d="M-72 12 Q-75 2 -62 0 L62 0 Q75 2 75 15 L78 32 Q80 42 65 44 L-65 44 Q-78 42 -72 12 Z"/>
      <path fill="url(#goldSoft)" d="M-62 0 L62 0 L58 -18 L-58 -18 Z" opacity="0.4"/>
      <ellipse cx="0" cy="22" rx="68" ry="18" fill="url(#gold)" opacity="0.7"/>
      <circle cx="0" cy="-28" r="6" fill="${GOLD_LIGHT}" opacity="0.5"/>
    </g>`,

  mocassins: `
    <g transform="translate(256,275) scale(1.05)" filter="url(#glow)">
      <path fill="url(#gold)" d="M-70 15 Q-72 5 -58 2 L58 2 Q72 5 72 18 L76 35 Q78 45 62 47 L-62 47 Q-76 45 -70 15 Z"/>
      <path fill="url(#goldSoft)" d="M-58 2 L58 2 L52 -22 L-52 -22 Z" opacity="0.4"/>
      <path fill="none" stroke="${GOLD_LIGHT}" stroke-width="2.5" stroke-linecap="round" d="M-35 -22 Q0 -38 35 -22"/>
      <path fill="${GOLD_LIGHT}" d="M-8 -32 L8 -32 L6 -22 L-6 -22 Z" opacity="0.55"/>
      <ellipse cx="0" cy="30" rx="65" ry="14" fill="url(#gold)" opacity="0.65"/>
    </g>`,

  sabots: `
    <g transform="translate(256,268) scale(1.08)" filter="url(#glow)">
      <path fill="url(#gold)" d="M-55 -30 L-55 30 Q-55 45 -40 48 L40 48 Q55 45 55 30 L55 -30 Q55 -45 40 -48 L-40 -48 Q-55 -45 -55 -30 Z"/>
      <path fill="url(#goldSoft)" d="M-40 -48 L40 -48 L38 -20 L-38 -20 Z" opacity="0.35"/>
      <rect x="-50" y="48" width="100" height="12" rx="4" fill="url(#gold)" opacity="0.8"/>
      <path fill="none" stroke="${GOLD_LIGHT}" stroke-width="1.5" opacity="0.3" d="M-30 -20 L30 -20"/>
    </g>`,

  derbies: `
    <g transform="translate(256,275) scale(1.05)" filter="url(#glow)">
      <path fill="url(#gold)" d="M-68 15 Q-70 5 -58 2 L58 2 Q70 5 70 18 L74 35 Q76 45 60 47 L-60 47 Q-74 45 -68 15 Z"/>
      <path fill="url(#goldSoft)" d="M-58 2 L58 2 L52 -25 L-52 -25 Z" opacity="0.4"/>
      <path fill="none" stroke="${GOLD_LIGHT}" stroke-width="2" d="M0 -25 L0 15"/>
      <circle cx="-25" cy="5" r="5" fill="none" stroke="${GOLD_LIGHT}" stroke-width="1.5" opacity="0.5"/>
      <circle cx="25" cy="5" r="5" fill="none" stroke="${GOLD_LIGHT}" stroke-width="1.5" opacity="0.5"/>
      <path fill="none" stroke="${GOLD_LIGHT}" stroke-width="1.5" opacity="0.4" d="M-25 5 L-15 -15 M25 5 L15 -15"/>
    </g>`,

  baskets: `
    <g transform="translate(256,270) scale(1.05)" filter="url(#glow)">
      <path fill="url(#gold)" d="M-72 20 Q-75 8 -60 5 L60 5 Q75 8 75 22 L78 38 Q80 50 65 52 L-65 52 Q-80 50 -72 20 Z"/>
      <path fill="url(#goldSoft)" d="M-60 5 L60 5 L55 -30 L-55 -30 Z" opacity="0.35"/>
      <path fill="none" stroke="${GOLD_LIGHT}" stroke-width="2.5" stroke-linecap="round" d="M-55 -30 L-40 -55 L40 -55 L55 -30"/>
      <ellipse cx="0" cy="35" rx="70" ry="16" fill="url(#gold)" opacity="0.55"/>
    </g>`,

  bottes: `
    <g transform="translate(256,255) scale(0.95)" filter="url(#glow)">
      <path fill="url(#gold)" d="M-45 -90 L-45 30 Q-45 45 -30 48 L30 48 Q45 45 45 30 L45 -90 Q45 -100 35 -102 L-35 -102 Q-45 -100 -45 -90 Z"/>
      <path fill="url(#goldSoft)" d="M-35 -102 L35 -102 L32 -60 L-32 -60 Z" opacity="0.4"/>
      <path fill="none" stroke="${GOLD_LIGHT}" stroke-width="1.5" opacity="0.3" d="M-32 -60 L32 -60"/>
      <path fill="url(#gold)" d="M30 48 L35 62 Q38 70 25 72 L-25 72 Q-38 70 -35 62 L-30 48 Z"/>
      <ellipse cx="0" cy="-75" rx="38" ry="8" fill="none" stroke="${GOLD_LIGHT}" stroke-width="1" opacity="0.25"/>
    </g>`,

  chaussures: `
    <g transform="translate(256,275) scale(1.05)" filter="url(#glow)">
      <path fill="url(#gold)" d="M-68 18 Q-70 8 -55 5 L55 5 Q70 8 72 20 L76 36 Q78 46 62 48 L-62 48 Q-76 46 -68 18 Z"/>
      <path fill="url(#goldSoft)" d="M-55 5 L55 5 L48 -28 L-48 -28 Z" opacity="0.4"/>
      <path fill="url(#gold)" d="M62 48 L68 58 Q70 66 55 68 L-55 68 Q-70 66 -65 58 L-62 48 Z"/>
      <path fill="none" stroke="${GOLD_LIGHT}" stroke-width="1" opacity="0.25" d="M-48 -28 Q0 -42 48 -28"/>
    </g>`,

  sacs: `
    <g transform="translate(256,260) scale(1)" filter="url(#glow)">
      <path fill="url(#gold)" d="M-55 10 Q-58 0 -48 -5 L48 -5 Q58 0 55 10 L60 55 Q62 68 50 70 L-50 70 Q-62 68 -60 55 Z"/>
      <path fill="url(#goldSoft)" d="M-48 -5 L48 -5 L42 -35 L-42 -35 Z" opacity="0.45"/>
      <path fill="none" stroke="url(#goldSoft)" stroke-width="3" stroke-linecap="round" d="M-28 -35 Q-28 -65 0 -72 Q28 -65 28 -35"/>
      <rect x="-8" y="-72" width="16" height="8" rx="3" fill="${GOLD_LIGHT}" opacity="0.5"/>
      <line x1="-35" y1="25" x2="35" y2="25" stroke="${GOLD_LIGHT}" stroke-width="1" opacity="0.2"/>
    </g>`,

  pochettes: `
    <g transform="translate(256,265) scale(1.05)" filter="url(#glow)">
      <rect x="-60" y="-40" width="120" height="75" rx="8" fill="url(#gold)"/>
      <rect x="-55" y="-35" width="110" height="65" rx="6" fill="url(#goldSoft)" opacity="0.35"/>
      <path fill="none" stroke="${GOLD_LIGHT}" stroke-width="2.5" stroke-linecap="round" d="M-30 -40 Q-30 -58 0 -62 Q30 -58 30 -40"/>
      <circle cx="0" cy="5" r="8" fill="none" stroke="${GOLD_LIGHT}" stroke-width="1.5" opacity="0.5"/>
      <line x1="-40" y1="15" x2="40" y2="15" stroke="${GOLD_LIGHT}" stroke-width="0.8" opacity="0.2"/>
    </g>`,

  valises: `
    <g transform="translate(256,258) scale(1)" filter="url(#glow)">
      <rect x="-55" y="-55" width="110" height="95" rx="10" fill="url(#gold)"/>
      <rect x="-48" y="-48" width="96" height="81" rx="6" fill="url(#goldSoft)" opacity="0.3"/>
      <line x1="-55" y1="-15" x2="55" y2="-15" stroke="${GOLD_LIGHT}" stroke-width="1.5" opacity="0.35"/>
      <rect x="-12" y="-68" width="24" height="18" rx="4" fill="url(#gold)"/>
      <circle cx="-35" cy="25" r="6" fill="${GOLD_DARK}" opacity="0.6"/>
      <circle cx="35" cy="25" r="6" fill="${GOLD_DARK}" opacity="0.6"/>
      <rect x="-8" y="-5" width="16" height="20" rx="2" fill="none" stroke="${GOLD_LIGHT}" stroke-width="1.5" opacity="0.4"/>
    </g>`,

  lunettes: `
    <g transform="translate(256,256) scale(1.15)" filter="url(#glow)">
      <circle cx="-55" cy="0" r="42" fill="none" stroke="url(#gold)" stroke-width="10"/>
      <circle cx="55" cy="0" r="42" fill="none" stroke="url(#gold)" stroke-width="10"/>
      <circle cx="-55" cy="0" r="32" fill="url(#goldSoft)" opacity="0.25"/>
      <circle cx="55" cy="0" r="32" fill="url(#goldSoft)" opacity="0.25"/>
      <path fill="none" stroke="${GOLD_LIGHT}" stroke-width="6" stroke-linecap="round" d="M-13 0 Q0 -12 13 0"/>
      <path fill="none" stroke="url(#gold)" stroke-width="7" stroke-linecap="round" d="M-97 0 L-115 -8"/>
      <path fill="none" stroke="url(#gold)" stroke-width="7" stroke-linecap="round" d="M97 0 L115 -8"/>
    </g>`,

  tout: `
    <g transform="translate(256,256) scale(1)" filter="url(#glow)">
      <rect x="-55" y="-55" width="50" height="50" rx="6" fill="url(#gold)" opacity="0.85"/>
      <rect x="5" y="-55" width="50" height="50" rx="6" fill="url(#goldSoft)" opacity="0.7"/>
      <rect x="-55" y="5" width="50" height="50" rx="6" fill="url(#goldSoft)" opacity="0.7"/>
      <rect x="5" y="5" width="50" height="50" rx="6" fill="url(#gold)" opacity="0.85"/>
      <circle cx="-30" cy="-30" r="8" fill="${GOLD_LIGHT}" opacity="0.4"/>
      <circle cx="30" cy="30" r="8" fill="${GOLD_LIGHT}" opacity="0.4"/>
    </g>`,
};

for (const [name, content] of Object.entries(categories)) {
  const svg = wrap(content);
  const path = join(outDir, `${name}.svg`);
  writeFileSync(path, svg, "utf8");
  console.log(`Created ${path}`);
}

console.log(`\nDone — ${Object.keys(categories).length} category illustrations.`);
