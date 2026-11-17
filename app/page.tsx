import { Explore } from "@/components/explore/explore";
import { getExploreData } from "@/lib/data/explore-data";

export default async function ExplorePage() {
  const data = await getExploreData();
  return <Explore {...data} />;
}
