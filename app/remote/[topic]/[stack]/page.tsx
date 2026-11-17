import { notFound } from "next/navigation";
import { LandingView } from "@/components/landing/landing-view";
import { getLandingTopics } from "@/lib/data/explore-data";
import { landingData, landingMetadata } from "@/lib/data/landing-data";
import { parseTopic } from "@/lib/landing";

export async function generateStaticParams() {
  const pages = await getLandingTopics();
  return pages
    .filter(({ topic }) => topic.region && topic.stack)
    .map(({ topic }) => ({ topic: topic.region!, stack: topic.stack! }));
}

export async function generateMetadata({ params }: PageProps<"/remote/[topic]/[stack]">) {
  const { topic, stack } = await params;
  return landingMetadata(parseTopic(topic, stack));
}

export default async function RegionStackPage({ params }: PageProps<"/remote/[topic]/[stack]">) {
  const { topic, stack } = await params;
  const [data, pages] = await Promise.all([landingData(parseTopic(topic, stack)), getLandingTopics()]);
  if (!data) notFound();
  return <LandingView topic={data.topic} companies={data.matches} hiring={data.hiring} newSince={data.newSince} pages={pages} />;
}
