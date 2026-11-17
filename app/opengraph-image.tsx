import { ImageResponse } from "next/og";
import { getExplorePreview } from "@/lib/data/explore-data";
import { getJobsPreview } from "@/lib/data/jobs";
import { OG, OG_SIZE, OgChip, OgHorizonSun, OgWordmark, ogFonts } from "@/lib/og";

export const alt = "Remote Jobs: remote-friendly tech companies and the roles they're hiring for";
export const size = OG_SIZE;
export const contentType = "image/png";

const number = new Intl.NumberFormat("en");

/** The default card for every page without its own: the home page, Jobs, About and the rest. */
export default async function Image() {
  const [{ total, hiringCount }, jobs] = await Promise.all([getExplorePreview(), getJobsPreview()]);

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
          padding: "72px 80px",
          background: OG.bg,
          color: OG.text,
          fontFamily: "Figtree",
          overflow: "hidden",
        }}
      >
        <OgHorizonSun />
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
          <OgWordmark fontSize={96} />
          <div style={{ marginTop: 34, fontSize: 40, fontWeight: 600, lineHeight: 1.3, color: OG.soft }}>
            Remote-friendly tech companies and the roles they’re hiring for, straight from their job boards.
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <OgChip tone="sun">{`${number.format(jobs.total)} remote roles`}</OgChip>
          <OgChip>{`${number.format(total)} companies`}</OgChip>
          <OgChip>{`${hiringCount} hiring now`}</OgChip>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
