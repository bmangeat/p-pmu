import sharp from "sharp";
import { mkdirSync } from "node:fs";

// Icône P-PMU : carré orange arrondi + réveil blanc stylisé.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#f97316"/>
  <g stroke="#ffffff" stroke-width="22" fill="none" stroke-linecap="round">
    <circle cx="256" cy="276" r="132" fill="#ffffff" stroke="none"/>
    <circle cx="256" cy="276" r="132"/>
    <line x1="200" y1="120" x2="160" y2="84"/>
    <line x1="312" y1="120" x2="352" y2="84"/>
  </g>
  <g stroke="#f97316" stroke-width="20" stroke-linecap="round">
    <line x1="256" y1="276" x2="256" y2="196"/>
    <line x1="256" y1="276" x2="312" y2="300"/>
  </g>
  <circle cx="256" cy="276" r="14" fill="#f97316"/>
</svg>`;

const out = (path, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(path);

mkdirSync("public", { recursive: true });
mkdirSync("src/app", { recursive: true });

await Promise.all([
  out("public/icon-192.png", 192),
  out("public/icon-512.png", 512),
  out("src/app/apple-icon.png", 180),
  out("src/app/icon.png", 256),
]);

console.log("Icônes générées.");
