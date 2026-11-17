import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getCompany, getCompanyIndex } from "@/lib/data/companies";
import { getBoard, getOpenRoles } from "@/lib/data/job-boards";
import { label, regionLabels, remotePolicyLabels } from "@/lib/data/labels";
import { BRAND, GLYPH } from "@/lib/brand-mark";

export const alt = "Company profile on Remote Jobs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Rendered at build like the pages, so sharing never waits on a cold render.
export async function generateStaticParams() {
  const companies = await getCompanyIndex();
  return companies.map((company) => ({ slug: company.slug }));
}

function Pill({ children, background, color }: { children: React.ReactNode; background: string; color: string }) {
  return (
    <div style={{ display: "flex", padding: "10px 22px", borderRadius: 999, background, color, fontSize: 28, fontWeight: 600 }}>
      {children}
    </div>
  );
}

// Figtree, the app's typeface (assets/fonts, SIL Open Font License).
const fonts = Promise.all(
  [600, 800].map(async (weight) => ({
    name: "Figtree",
    weight: weight as 600 | 800,
    style: "normal" as const,
    data: await readFile(join(process.cwd(), `assets/fonts/figtree-latin-${weight}-normal.woff`)),
  })),
);

/** The card shown when a company page is shared in chats and social apps. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await getCompany(slug);
  const board = getBoard(slug);
  const roles = board ? await getOpenRoles(board) : null;
  const name = company?.name ?? "Remote Jobs";
  const { sun, horizon, path, rays } = GLYPH;

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: 72, background: BRAND.violet, color: BRAND.white, fontFamily: "Figtree" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 512 512">
            <rect width="512" height="512" rx="116" fill={BRAND.white} fillOpacity="0.16" />
            {rays.map((ray) => (
              <line key={ray.x2} {...ray} stroke={BRAND.sun} strokeWidth="22" strokeLinecap="round" />
            ))}
            <path d={sun} fill={BRAND.sun} />
            <rect {...horizon} rx={16} fill={BRAND.white} />
            <rect {...path} rx={14} fill={BRAND.white} opacity="0.7" />
          </svg>
          <div style={{ fontSize: 34, fontWeight: 800 }}>Remote Jobs</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ fontSize: name.length > 24 ? 76 : 96, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            {name}
          </div>
          {company?.domain && <div style={{ marginTop: 12, fontSize: 34, fontWeight: 600, opacity: 0.85 }}>{company.domain}</div>}
          <div style={{ display: "flex", gap: 14, marginTop: 36 }}>
            {roles && roles.total > 0 && (
              <Pill background={BRAND.sun} color="#3d2a00">
                {`Hiring · ${roles.remote > 0 ? `${roles.remote} remote` : roles.total} role${(roles.remote || roles.total) === 1 ? "" : "s"}`}
              </Pill>
            )}
            {company && (
              <Pill background="rgba(255,255,255,0.16)" color={BRAND.white}>
                {label(regionLabels, company.region) || "Remote"}
              </Pill>
            )}
            {company?.remotePolicy && (
              <Pill background="rgba(255,255,255,0.16)" color={BRAND.white}>
                {label(remotePolicyLabels, company.remotePolicy)}
              </Pill>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await fonts },
  );
}
