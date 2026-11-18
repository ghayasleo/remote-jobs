import "server-only";

import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand-mark";
import { OG, OgSun, OgWordmark, ogFonts } from "@/lib/og";
import type { CardSpec } from "@/lib/social";

// Images for the Bluesky posts (lib/social.ts plans them): the share card's
// ink, sun and Figtree, at 1200×675, the shape Bluesky previews best.

export const CARD_SIZE = { width: 1200, height: 675 };

const number = new Intl.NumberFormat("en");

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        width: "100%",
        height: "100%",
        padding: "64px 72px",
        background: OG.bg,
        color: OG.text,
        fontFamily: "Figtree",
        overflow: "hidden",
      }}
    >
      <OgSun size={420} style={{ position: "absolute", right: -170, bottom: -60 }} />
      {children}
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 26, fontWeight: 600, color: OG.muted }}>
        <OgWordmark fontSize={40} />
        <span>remotejobs.ghayasuddin.net</span>
      </div>
    </div>
  );
}

function Insight({ card }: { card: Extract<CardSpec, { type: "insight" }> }) {
  const size = card.number.length > 9 ? 120 : 168;
  return (
    <Frame>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 860 }}>
        <div style={{ fontSize: 34, fontWeight: 600, color: BRAND.sun }}>{card.label}</div>
        <div style={{ marginTop: 18, fontSize: size, fontWeight: 800, letterSpacing: -size * 0.03, lineHeight: 1 }}>{card.number}</div>
        <div style={{ marginTop: 24, fontSize: 44, fontWeight: 600, lineHeight: 1.25, color: OG.soft }}>{card.caption}</div>
      </div>
    </Frame>
  );
}

function Weekly({ card }: { card: Extract<CardSpec, { type: "weekly" }> }) {
  const max = Math.max(...card.bars.map((bar) => bar.value), 1);
  return (
    <Frame>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 880 }}>
        <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1 }}>{card.title}</div>
        <div style={{ display: "flex", gap: 48, marginTop: 26 }}>
          {card.stats.map(([label, value]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1 }}>{value}</div>
              <div style={{ marginTop: 6, fontSize: 26, fontWeight: 600, color: OG.muted }}>{label}</div>
            </div>
          ))}
        </div>
        {card.bars.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 30 }}>
            {card.bars.map((bar) => (
              <div key={bar.label} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, fontWeight: 600 }}>
                <div style={{ display: "flex", width: 230, color: OG.soft }}>{bar.label.length > 18 ? `${bar.label.slice(0, 17)}…` : bar.label}</div>
                <div style={{ display: "flex", height: 22, width: Math.max(8, Math.round((bar.value / max) * 420)), borderRadius: "0 6px 6px 0", background: BRAND.sun }} />
                <div style={{ display: "flex" }}>{number.format(bar.value)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}

/** The card as a PNG response. */
export async function renderCard(card: CardSpec) {
  return new ImageResponse(card.type === "insight" ? <Insight card={card} /> : <Weekly card={card} />, {
    ...CARD_SIZE,
    fonts: await ogFonts(),
  });
}
