import { Explore } from "@/components/explore/explore";
import { getExplorePreview } from "@/lib/data/explore-data";

export default async function ExplorePage() {
  const preview = await getExplorePreview();
  return <Explore {...preview} />;
}
