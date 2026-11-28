/**
 * The CV check is still being built, and is planned as part of the paid
 * tools. It works under `next dev`; the production site leaves it out
 * entirely: its page and API answer 404, and nothing links to it or
 * mentions it.
 */
export const CV_CHECK_ENABLED = process.env.NODE_ENV === "development";

/**
 * The CV maker (a main CV and copies tailored to saved jobs, made with LaTeX
 * in the browser) and the signed-in account MCP server: development only for
 * now, like the CV check. In production their pages and APIs answer 404.
 */
export const CV_MAKER_ENABLED = process.env.NODE_ENV === "development";
export const ACCOUNT_MCP_ENABLED = process.env.NODE_ENV === "development";
