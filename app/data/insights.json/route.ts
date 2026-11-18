import { getInsights } from "@/lib/data/insights";

// The "State of remote hiring" numbers, for the daily history recorder
// (.github/workflows/record-history.yml). Prerendered and refreshed hourly.
export async function GET() {
  return Response.json(await getInsights());
}
