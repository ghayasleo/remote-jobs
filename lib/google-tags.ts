// Google Tag Manager and Google Analytics 4, switched on by environment
// variables (see .env.example). Both run under Google Consent Mode v2:
// visitors in the EEA, UK and Switzerland get analytics cookies only after
// they allow them, and ad storage is always off because the site shows no ads.

const valid = (value: string | undefined, pattern: RegExp) => {
  const id = value?.trim().toUpperCase();
  return id && pattern.test(id) ? id : null;
};

export const parseGtmId = (value: string | undefined) => valid(value, /^GTM-[A-Z0-9]{4,12}$/);
export const parseGaId = (value: string | undefined) => valid(value, /^G-[A-Z0-9]{4,16}$/);

// NEXT_PUBLIC_ values are inlined at build time, so the browser knows them too.
export const GTM_ID = parseGtmId(process.env.NEXT_PUBLIC_GTM_ID);
export const GA_ID = parseGaId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
export const ANALYTICS_ENABLED = Boolean(GTM_ID || GA_ID);

export const CONSENT_KEY = "analytics-consent";

/** Where analytics cookies wait for a yes: the EEA, the UK and Switzerland. */
export const CONSENT_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU",
  "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
];

/**
 * The inline script that sets consent defaults, re-applies a saved choice,
 * then loads Tag Manager and/or GA4, in that order. IDs are validated above,
 * so they're safe to embed.
 */
export function googleTagsScript({ gtmId, gaId }: { gtmId: string | null; gaId: string | null }) {
  const lines = [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}",
    "window.gtag=gtag;",
    "var noAds={ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};",
    `gtag('consent','default',Object.assign({analytics_storage:'denied',wait_for_update:500,region:${JSON.stringify(CONSENT_REGIONS)}},noAds));`,
    "gtag('consent','default',Object.assign({analytics_storage:'granted'},noAds));",
    `try{var c=localStorage.getItem(${JSON.stringify(CONSENT_KEY)});if(c==='granted'||c==='denied')gtag('consent','update',{analytics_storage:c});}catch(e){}`,
    "function load(src){var s=document.createElement('script');s.async=true;s.src=src;document.head.appendChild(s);}",
  ];
  if (gaId) {
    lines.push(
      "gtag('js',new Date());",
      `gtag('config',${JSON.stringify(gaId)});`,
      `load('https://www.googletagmanager.com/gtag/js?id=${gaId}');`,
    );
  }
  if (gtmId) {
    lines.push(
      "dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});",
      `load('https://www.googletagmanager.com/gtm.js?id=${gtmId}');`,
    );
  }
  return `(function(){${lines.join("")}})();`;
}
