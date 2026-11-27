import { ImageResponse } from "next/og";
import { getCompany, getCompanyIndex } from "@/lib/data/companies";
import { getBoard } from "@/lib/data/job-boards";
import { label, regionLabels, remotePolicyLabels } from "@/lib/data/labels";
import { OG, OG_SIZE, OgChip, OgHorizonSun, OgWordmark, ogClip, ogFonts, ogText } from "@/lib/og";

export const alt = "Company profile on Remote Jobs";
export const size = OG_SIZE;
export const contentType = "image/png";

// Rendered at build like the pages, so sharing never waits on a cold render.
export async function generateStaticParams() {
  const companies = await getCompanyIndex();
  return companies.map((company) => ({ slug: company.slug }));
}

/** The company's icon as a data URL, or null to show its initial instead. */
async function logoDataUrl(domain: string | null) {
  if (!domain) return null;
  try {
    const response = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`, {
      signal: AbortSignal.timeout(4_000),
    });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.startsWith("image/")) return null;
    return `data:${type};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * The card shown when a company page is shared in chats and social apps. It
 * shows nothing that changes hourly (like role counts), so it's rendered once
 * and kept until the company's profile changes.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await getCompany(slug);
  const hasBoard = getBoard(slug) !== null;
  const logo = await logoDataUrl(company?.domain ?? null);
  const name = ogText(company?.name ?? "Remote Jobs");
  const blurb = company?.blurb ? ogClip(company.blurb, 118) : null;

  return new ImageResponse(
    (
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
        <OgHorizonSun />
        <OgWordmark fontSize={38} />

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 790 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 104,
                height: 104,
                borderRadius: 26,
                background: "#ffffff",
                flexShrink: 0,
              }}
            >
              {logo ? (
                <img src={logo} width={64} height={64} alt="" style={{ borderRadius: 10 }} />
              ) : (
                <div style={{ fontSize: 56, fontWeight: 800, color: OG.bg }}>{name.charAt(0).toUpperCase()}</div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: name.length > 22 ? 60 : 76, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>
                {name}
              </div>
              {company?.domain && (
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 600, color: OG.muted }}>{company.domain}</div>
              )}
            </div>
          </div>
          {blurb && (
            <div style={{ marginTop: 30, fontSize: 30, fontWeight: 600, lineHeight: 1.35, color: OG.soft }}>{blurb}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {hasBoard && <OgChip tone="sun">Live open roles</OgChip>}
          {company && <OgChip>{label(regionLabels, company.region) || "Remote"}</OgChip>}
          {company?.remotePolicy && <OgChip>{label(remotePolicyLabels, company.remotePolicy)}</OgChip>}
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
