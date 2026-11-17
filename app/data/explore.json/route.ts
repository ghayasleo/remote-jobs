import { getExploreData } from "@/lib/data/explore-data";

// Prerendered with the rest of the site and refreshed with the hourly role data.
export async function GET() {
  return Response.json(await getExploreData());
}
