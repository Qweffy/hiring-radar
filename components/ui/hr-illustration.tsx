import { useId } from "react";
import  { type SVGProps } from "react";

/* ============================================================================
   Canonical illustration pack — the ONLY illustrations allowed in Hiring Radar.
   Artwork is embedded inline (byte-identical to the design handoff's
   assets/illustrations/<name>.svg) so the bundle is self-contained and
   path-independent. The hex values below are part of the canonical artwork,
   not component styling — to change a drawing, edit the .svg in the pack and
   re-sync, never fork it here.
   ============================================================================ */
interface ArtAsset {
  vb: string;
  inner: string;
}

const ART = {
  'empty-radar': { vb: '0 0 120 120', inner: '<circle cx="60" cy="60" r="46" stroke="#5C8A77" stroke-opacity="0.34" stroke-width="1.5"></circle><circle cx="60" cy="60" r="31" stroke="#5C8A77" stroke-opacity="0.26" stroke-width="1.5"></circle><circle cx="60" cy="60" r="16" stroke="#5C8A77" stroke-opacity="0.26" stroke-width="1.5"></circle><line x1="60" y1="14" x2="60" y2="106" stroke="#5C8A77" stroke-opacity="0.18" stroke-width="1.5"></line><line x1="14" y1="60" x2="106" y2="60" stroke="#5C8A77" stroke-opacity="0.18" stroke-width="1.5"></line><path d="M60 60 L60 14 A46 46 0 0 1 93.1 28 Z" fill="#5C8A77" fill-opacity="0.07"></path><line x1="60" y1="60" x2="60" y2="14" stroke="#5C8A77" stroke-opacity="0.4" stroke-width="1.5"></line><circle cx="60" cy="60" r="2" fill="#5C8A77" fill-opacity="0.6"></circle>' },
  'lonely-blip': { vb: '0 0 120 120', inner: '<defs><filter id="lb_g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.4"></feGaussianBlur></filter></defs><circle cx="60" cy="60" r="46" stroke="#3DFFA2" stroke-opacity="0.20" stroke-width="1.5"></circle><circle cx="60" cy="60" r="31" stroke="#3DFFA2" stroke-opacity="0.16" stroke-width="1.5"></circle><circle cx="60" cy="60" r="16" stroke="#3DFFA2" stroke-opacity="0.16" stroke-width="1.5"></circle><line x1="60" y1="14" x2="60" y2="106" stroke="#3DFFA2" stroke-opacity="0.10" stroke-width="1.5"></line><line x1="14" y1="60" x2="106" y2="60" stroke="#3DFFA2" stroke-opacity="0.10" stroke-width="1.5"></line><circle cx="78" cy="44" r="20" stroke="#3DFFA2" stroke-opacity="0.16" stroke-width="1.5"></circle><circle cx="78" cy="44" r="12" stroke="#3DFFA2" stroke-opacity="0.34" stroke-width="1.5"></circle><circle cx="78" cy="44" r="7" fill="#3DFFA2" opacity="0.4" filter="url(#lb_g)"></circle><circle cx="78" cy="44" r="3.2" fill="#3DFFA2"></circle>' },
  'agent-orb-idle': { vb: '0 0 120 120', inner: '<ellipse cx="60" cy="60" rx="48" ry="19" transform="rotate(-22 60 60)" stroke="#A78BFA" stroke-opacity="0.20" stroke-width="1.5"></ellipse><ellipse cx="60" cy="60" rx="48" ry="19" transform="rotate(34 60 60)" stroke="#A78BFA" stroke-opacity="0.16" stroke-width="1.5"></ellipse><circle cx="60" cy="60" r="26" stroke="#A78BFA" stroke-opacity="0.34" stroke-width="1.5"></circle><circle cx="60" cy="60" r="16" stroke="#A78BFA" stroke-opacity="0.24" stroke-width="1.5"></circle><circle cx="60" cy="60" r="6.5" fill="#A78BFA" fill-opacity="0.30"></circle><circle cx="98" cy="46" r="2.4" fill="#A78BFA" fill-opacity="0.5"></circle>' },
  'agent-orb-active': { vb: '0 0 120 120', inner: '<defs><filter id="orb_g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"></feGaussianBlur></filter></defs><ellipse cx="60" cy="60" rx="48" ry="19" transform="rotate(-22 60 60)" stroke="#A78BFA" stroke-opacity="0.45" stroke-width="1.5"></ellipse><ellipse cx="60" cy="60" rx="48" ry="19" transform="rotate(34 60 60)" stroke="#A78BFA" stroke-opacity="0.38" stroke-width="1.5"></ellipse><circle cx="60" cy="60" r="26" stroke="#A78BFA" stroke-opacity="0.7" stroke-width="1.5"></circle><circle cx="60" cy="60" r="16" stroke="#A78BFA" stroke-opacity="0.5" stroke-width="1.5"></circle><circle cx="60" cy="60" r="13" fill="#A78BFA" opacity="0.5" filter="url(#orb_g)"></circle><circle cx="60" cy="60" r="7" fill="#A78BFA"></circle><circle cx="98" cy="46" r="3.4" fill="#A78BFA" filter="url(#orb_g)"></circle><circle cx="98" cy="46" r="2.4" fill="#E8F0F2"></circle>' },
  'flatline-calibration': { vb: '0 0 120 120', inner: '<line x1="20" y1="26" x2="20" y2="92" stroke="#3DFFA2" stroke-opacity="0.18" stroke-width="1.5"></line><line x1="20" y1="92" x2="104" y2="92" stroke="#3DFFA2" stroke-opacity="0.18" stroke-width="1.5"></line><line x1="22" y1="42" x2="104" y2="42" stroke="#4CC9F0" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="2 5"></line><text x="104" y="38" text-anchor="end" font-family="&#39;JetBrains Mono&#39;, monospace" font-size="8" fill="#4CC9F0" fill-opacity="0.7">target</text><rect x="30" y="89" width="9" height="3" rx="1" fill="#3DFFA2" fill-opacity="0.5"></rect><rect x="44" y="89" width="9" height="3" rx="1" fill="#3DFFA2" fill-opacity="0.5"></rect><rect x="58" y="89" width="9" height="3" rx="1" fill="#3DFFA2" fill-opacity="0.5"></rect><rect x="72" y="89" width="9" height="3" rx="1" fill="#3DFFA2" fill-opacity="0.5"></rect><rect x="86" y="89" width="9" height="3" rx="1" fill="#3DFFA2" fill-opacity="0.5"></rect>' },
  'clean-signal': { vb: '0 0 120 120', inner: '<defs><filter id="cs_g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.4"></feGaussianBlur></filter></defs><circle cx="60" cy="60" r="42" stroke="#3DFFA2" stroke-opacity="0.20" stroke-width="1.5"></circle><circle cx="60" cy="60" r="26" stroke="#3DFFA2" stroke-opacity="0.14" stroke-width="1.5"></circle><path d="M50 60 l7 7 l14 -17" stroke="#3DFFA2" stroke-width="3" opacity="0.5" filter="url(#cs_g)"></path><path d="M50 60 l7 7 l14 -17" stroke="#3DFFA2" stroke-width="2.5"></path>' },
  'lost-signal': { vb: '0 0 120 120', inner: '<defs><filter id="ls_g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.2"></feGaussianBlur></filter></defs><path d="M60 14 A46 46 0 0 0 60 106" stroke="#3DFFA2" stroke-opacity="0.22" stroke-width="1.5"></path><path d="M60 29 A31 31 0 0 0 60 91" stroke="#3DFFA2" stroke-opacity="0.18" stroke-width="1.5"></path><line x1="14" y1="60" x2="46" y2="60" stroke="#3DFFA2" stroke-opacity="0.14" stroke-width="1.5"></line><path d="M64 15 A46 46 0 0 1 104 56" stroke="#FF5D5D" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="6 5" transform="translate(3 -2)"></path><path d="M62 30 A31 31 0 0 1 90 70" stroke="#FF5D5D" stroke-opacity="0.4" stroke-width="1.5" stroke-dasharray="4 5" transform="translate(5 1)"></path><path d="M84 92 A46 46 0 0 0 105 64" stroke="#FF5D5D" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="5 6" transform="translate(-2 3)"></path><rect x="58" y="56" width="52" height="8" fill="#FF5D5D" fill-opacity="0.07"></rect><line x1="44" y1="56" x2="112" y2="56" stroke="#FFC857" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="3 4"></line><line x1="50" y1="64" x2="106" y2="64" stroke="#FF5D5D" stroke-opacity="0.4" stroke-width="1.5" stroke-dasharray="3 4" transform="translate(6 0)"></line><rect x="92" y="38" width="9" height="3" fill="#FFC857" fill-opacity="0.6"></rect><rect x="86" y="78" width="13" height="3" fill="#FF5D5D" fill-opacity="0.55"></rect><circle cx="82" cy="46" r="7" fill="#FF5D5D" opacity="0.45" filter="url(#ls_g)"></circle><circle cx="82" cy="46" r="3.2" fill="#FF5D5D"></circle><circle cx="60" cy="60" r="2" fill="#3DFFA2" fill-opacity="0.5"></circle>' },
  'off-the-grid': { vb: '0 0 120 120', inner: '<defs><filter id="og_g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.8"></feGaussianBlur></filter><clipPath id="og_clip"><path d="M6 14 H58 L54 26 L60 40 L52 54 L58 70 L50 84 L56 100 L6 106 Z"></path></clipPath></defs><g clip-path="url(#og_clip)" stroke="#3DFFA2" stroke-opacity="0.20" stroke-width="1.5"><line x1="6" y1="26" x2="58" y2="26"></line><line x1="6" y1="44" x2="58" y2="44"></line><line x1="6" y1="62" x2="58" y2="62"></line><line x1="6" y1="80" x2="58" y2="80"></line><line x1="6" y1="98" x2="58" y2="98"></line><line x1="20" y1="14" x2="20" y2="106"></line><line x1="36" y1="14" x2="36" y2="106"></line><line x1="52" y1="14" x2="52" y2="106"></line></g><path d="M58 14 L54 26 L60 40 L52 54 L58 70 L50 84 L56 100" stroke="#3DFFA2" stroke-opacity="0.5" stroke-width="1.5"></path><circle cx="40" cy="60" r="3" fill="#3DFFA2"></circle><circle cx="40" cy="60" r="9" stroke="#3DFFA2" stroke-opacity="0.3" stroke-width="1.5"></circle><line x1="40" y1="60" x2="108" y2="34" stroke="#3DFFA2" stroke-opacity="0.55" stroke-width="1.5"></line><path d="M40 60 L108 34 L104 50 Z" fill="#3DFFA2" fill-opacity="0.06"></path><g fill="#3DFFA2" fill-opacity="0.45"><circle cx="72" cy="48" r="1.3"></circle><circle cx="84" cy="40" r="1.3"></circle><circle cx="96" cy="60" r="1.3"></circle><circle cx="78" cy="72" r="1.3"></circle><circle cx="100" cy="44" r="1.3"></circle><circle cx="88" cy="86" r="1.3"></circle><circle cx="104" cy="74" r="1.3"></circle><circle cx="68" cy="86" r="1.3"></circle></g>' },
  'static-interference': { vb: '0 0 96 96', inner: '<path d="M20 28 A38 38 0 0 1 76 30" stroke="#FF5D5D" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="7 5"></path><path d="M28 64 A26 26 0 0 0 70 62" stroke="#FFC857" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="5 5"></path><rect x="14" y="44" width="68" height="7" fill="#FF5D5D" fill-opacity="0.07"></rect><line x1="12" y1="44" x2="80" y2="44" stroke="#FFC857" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="3 4"></line><line x1="18" y1="51" x2="84" y2="51" stroke="#FF5D5D" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="3 4" transform="translate(5 0)"></line><g fill="#FFC857" fill-opacity="0.7"><rect x="30" y="32" width="2" height="2"></rect><rect x="58" y="36" width="2" height="2"></rect><rect x="44" y="60" width="2" height="2"></rect><rect x="66" y="56" width="2" height="2"></rect></g><g fill="#FF5D5D" fill-opacity="0.7"><rect x="38" y="38" width="2" height="2"></rect><rect x="52" y="64" width="2" height="2"></rect><rect x="24" y="56" width="2" height="2"></rect><rect x="70" y="40" width="2" height="2"></rect></g><circle cx="48" cy="48" r="2.4" fill="#FF5D5D"></circle>' },
  'blip-sprite': { vb: '0 0 56 56', inner: '<defs><filter id="bs_g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.4"></feGaussianBlur></filter></defs><circle cx="28" cy="28" r="22" stroke="#3DFFA2" stroke-opacity="0.16" stroke-width="1.5"></circle><circle cx="28" cy="28" r="13" stroke="#3DFFA2" stroke-opacity="0.34" stroke-width="1.5"></circle><circle cx="28" cy="28" r="8" fill="#3DFFA2" opacity="0.4" filter="url(#bs_g)"></circle><circle cx="28" cy="28" r="4" fill="#3DFFA2"></circle>' },
  'loading-sweep': { vb: '0 0 120 120', inner: '<circle cx="60" cy="60" r="46" stroke="#3DFFA2" stroke-opacity="0.14" stroke-width="1.5"></circle><circle cx="60" cy="60" r="31" stroke="#3DFFA2" stroke-opacity="0.10" stroke-width="1.5"></circle><path d="M60 60 L60 14 A46 46 0 0 1 99 38 Z" fill="#3DFFA2" fill-opacity="0.12"></path><line x1="60" y1="60" x2="60" y2="14" stroke="#3DFFA2" stroke-width="1.5"></line><circle cx="60" cy="60" r="2.4" fill="#3DFFA2"></circle>' },
  'mark': { vb: '0 0 64 64', inner: '<defs><filter id="mark_g" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.8"></feGaussianBlur></filter></defs><circle cx="32" cy="32" r="26" stroke="#3DFFA2" stroke-opacity="0.30" stroke-width="1.5"></circle><circle cx="32" cy="32" r="17" stroke="#3DFFA2" stroke-opacity="0.20" stroke-width="1.5"></circle><circle cx="32" cy="32" r="8" stroke="#3DFFA2" stroke-opacity="0.20" stroke-width="1.5"></circle><path d="M32 32 L32 6 A26 26 0 0 1 51.9 15.3 Z" fill="#3DFFA2" fill-opacity="0.12"></path><line x1="32" y1="32" x2="32" y2="6" stroke="#3DFFA2" stroke-opacity="0.6" stroke-width="1.5"></line><circle cx="32" cy="32" r="2.2" fill="#3DFFA2"></circle><circle cx="49" cy="22" r="6" fill="#3DFFA2" opacity="0.35" filter="url(#mark_g)"></circle><circle cx="49" cy="22" r="3" fill="#3DFFA2"></circle>' },
  'favicon': { vb: '0 0 24 24', inner: '<circle cx="12" cy="12" r="9.5" stroke="#3DFFA2" stroke-opacity="0.45" stroke-width="2.5"></circle><path d="M12 12 L12 2.5 A9.5 9.5 0 0 1 19.8 6.6 Z" fill="#3DFFA2" fill-opacity="0.16"></path><line x1="12" y1="12" x2="12" y2="2.5" stroke="#3DFFA2" stroke-opacity="0.7" stroke-width="2.5"></line><circle cx="17.6" cy="8.8" r="2.1" fill="#3DFFA2"></circle>' },
  'wordmark': { vb: '0 0 300 64', inner: '<g transform="translate(32 32)"><circle r="24" fill="none" stroke="#3DFFA2" stroke-opacity="0.22" stroke-width="1.5"></circle><circle r="15.5" fill="none" stroke="#3DFFA2" stroke-opacity="0.18" stroke-width="1.5"></circle><circle r="7" fill="none" stroke="#3DFFA2" stroke-opacity="0.18" stroke-width="1.5"></circle><path d="M0 0 L0 -24 A24 24 0 0 1 18.4 -15.4 Z" fill="#3DFFA2" fill-opacity="0.12"></path><line x1="0" y1="0" x2="0" y2="-24" stroke="#3DFFA2" stroke-opacity="0.55" stroke-width="1.5"></line><circle r="2.4" fill="#3DFFA2"></circle><circle cx="18" cy="-12" r="2.2" fill="#3DFFA2"></circle></g><text x="72" y="42" font-family="&#39;Space Grotesk&#39;, system-ui, sans-serif" font-size="30" font-weight="600" letter-spacing="-0.5" fill="#E8F0F2">hiring-radar</text><circle cx="99.5" cy="14.5" r="3.1" fill="#3DFFA2"></circle><circle cx="99.5" cy="14.5" r="6" fill="#3DFFA2" opacity="0.28" filter="url(#wm_glow)"></circle><defs><filter id="wm_glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2"></feGaussianBlur></filter></defs>' },
} satisfies Record<string, ArtAsset>;

type CanonicalName = keyof typeof ART;

/** Named asset from the canonical illustration pack (assets/illustrations/*.svg). */
export type IllustrationName = CanonicalName | "radar" | "bot" | "agent-orb";

// friendly aliases for older call sites
const ALIAS: Partial<Record<IllustrationName, CanonicalName>> = {
  radar: "empty-radar",
  bot: "agent-orb-idle",
  "agent-orb": "agent-orb-active",
};

/**
 * Renders a named asset from the canonical illustration pack — the only
 * illustrations allowed in Hiring Radar. Filter ids are namespaced per
 * instance so multiple illustrations can share a page without id collisions.
 */
export interface HRIllustrationProps extends SVGProps<SVGSVGElement> {
  /** @default 'empty-radar' */
  name?: IllustrationName;
  /** Rendered width in px (height derives from the asset's aspect ratio). @default 120 */
  size?: number;
}

export function HRIllustration({
  name = "empty-radar",
  size = 120,
  style,
  ...rest
}: HRIllustrationProps) {
  const resolved = ALIAS[name] ?? name;
  const art = resolved in ART ? ART[resolved as CanonicalName] : ART["empty-radar"];
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9]/g, "");
  const inner = art.inner
    .replace(/id="([^"]+)"/g, (_m: string, p: string) => `id="${p}-${uid}"`)
    .replace(/url\(#([^)]+)\)/g, (_m: string, p: string) => `url(#${p}-${uid})`);
  const parts = art.vb.split(/\s+/);
  const vw = Number.parseFloat(parts[2] ?? "") || 1;
  const vh = Number.parseFloat(parts[3] ?? "") || 1;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={art.vb}
      width={size}
      height={Math.round(size * (vh / vw))}
      fill="none"
      aria-hidden
      style={{ display: "block", ...style }}
      dangerouslySetInnerHTML={{ __html: inner }}
      {...rest}
    />
  );
}
