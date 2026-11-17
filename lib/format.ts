// Formatting shared by server and client components.

const dateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** "Oct 29, 2015", the same on the server and in every browser. */
export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}
