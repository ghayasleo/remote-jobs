import { notFound } from "next/navigation";
import { LandingView } from "@/components/landing/landing-view";
import { getLandingTopics } from "@/lib/data/explore-data";
import { landingData, landingMetadata } from "@/lib/data/landing-data";
import { parseTopic } from "@/lib/landing";

export async function generateStaticParams() {
  const pages = await getLandingTopics();
  return pages.filter(({ topic }) => !(topic.region && topic.stack)).map(({ path }) => ({ topic: path.split("/")[2] }));
}

export async function generateMetadata({ params }: PageProps<"/remote/[topic]">) {
  const { topic } = await params;
  return landingMetadata(parseTopic(topic));
}

export default async function TopicPage({ params }: PageProps<"/remote/[topic]">) {
  const { topic } = await params;
  const [data, pages] = await Promise.all([landingData(parseTopic(topic)), getLandingTopics()]);
  if (!data) notFound();
  return <LandingView topic={data.topic} companies={data.matches} hiring={data.hiring} newSince={data.newSince} pages={pages} />;
}
