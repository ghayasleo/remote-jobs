// The installed app (PWA) opens on Jobs and never shows the marketing home
// page: the logo and any visit to "/" go to /jobs instead. Plain module (no
// "use client"), so the layout can inline the script below.

export const APP_HOME = "/jobs";

/**
 * Runs before the page paints (inlined in the layout), so the installed app
 * never flashes the home page on its way to /jobs.
 */
export const STANDALONE_REDIRECT_SCRIPT = `try{if(location.pathname==="/"&&(matchMedia("(display-mode: standalone)").matches||navigator.standalone===true))location.replace("${APP_HOME}"+location.search)}catch(e){}`;
