/**
 * The CV check is still being built, and is planned as part of the paid
 * tools. It works under `next dev`; the production site leaves it out
 * entirely: its page and API answer 404, and nothing links to it or
 * mentions it.
 */
export const CV_CHECK_ENABLED = process.env.NODE_ENV === "development";
