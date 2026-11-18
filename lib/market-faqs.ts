import { formatCount, listAnd, type Faq } from "@/lib/faq";

type MarketNumbers = {
  remoteRoles: number;
  hiringCompanies: number;
  posted7: number;
  opened7: number | null;
  closed7: number | null;
  hasTrends: boolean;
  counts: Record<string, number>;
  postingMost: { name: string; count: number }[];
  paused: { name: string; then: number }[];
};

/** The questions the Market page answers, from its own numbers. Pure, so it's easy to test. */
export function marketFaqs(market: MarketNumbers, asOf: string): Faq[] {
  const faqs: Faq[] = [];
  const flow =
    market.opened7 !== null && market.closed7 !== null
      ? ` In the last 7 days ${formatCount(market.opened7)} roles opened and ${formatCount(market.closed7)} closed.`
      : ` ${formatCount(market.posted7)} were posted in the last 7 days.`;
  const balance = market.hasTrends
    ? ` Over the last four weeks, ${formatCount((market.counts.growing ?? 0) + (market.counts.started ?? 0))} companies grew their remote hiring and ${formatCount(
        (market.counts.slowing ?? 0) + (market.counts.paused ?? 0),
      )} slowed or paused.`
    : "";
  faqs.push({
    question: "Is remote tech hiring growing?",
    answer: `${formatCount(market.remoteRoles)} remote roles are open at ${formatCount(market.hiringCompanies)} companies as of ${asOf}.${flow}${balance}`,
  });
  if (market.postingMost.length >= 3) {
    faqs.push({
      question: "Which companies are posting the most remote roles?",
      answer: `${listAnd(market.postingMost.slice(0, 3).map((company) => `${company.name} (${formatCount(company.count)})`))} posted the most in the last 30 days.`,
    });
  }
  if (market.paused.length > 0) {
    faqs.push({
      question: "Which companies have paused remote hiring?",
      answer: `${listAnd(market.paused.slice(0, 3).map((company) => company.name))} had open remote roles four weeks ago and have none now.`,
    });
  }
  return faqs;
}
