import Script from "next/script";
import { GA_ID, GTM_ID, googleTagsScript } from "@/lib/google-tags";
import { ConsentBanner } from "./consent-banner";

/** Tag Manager and/or GA4 plus the cookie question, when their IDs are set. */
export function GoogleTags() {
  if (!GTM_ID && !GA_ID) return null;
  return (
    <>
      {/* After the page has loaded and gone idle, so the tags never compete
          with the first paint or the first tap. */}
      <Script id="google-tags" strategy="lazyOnload">
        {googleTagsScript({ gtmId: GTM_ID, gaId: GA_ID })}
      </Script>
      <ConsentBanner />
    </>
  );
}
