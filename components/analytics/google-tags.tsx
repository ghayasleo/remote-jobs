import Script from "next/script";
import { GA_ID, GTM_ID, googleTagsScript } from "@/lib/google-tags";
import { ConsentBanner } from "./consent-banner";

/** Tag Manager and/or GA4 plus the cookie question, when their IDs are set. */
export function GoogleTags() {
  if (!GTM_ID && !GA_ID) return null;
  return (
    <>
      <Script id="google-tags" strategy="afterInteractive">
        {googleTagsScript({ gtmId: GTM_ID, gaId: GA_ID })}
      </Script>
      <ConsentBanner />
    </>
  );
}
