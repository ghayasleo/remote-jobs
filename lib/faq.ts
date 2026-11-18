// Questions people ask about a page, answered from its own numbers, first
// sentence first. Shown on the page and described to search engines and AI
// assistants as a FAQPage.

export type Faq = { question: string; answer: string };

const number = new Intl.NumberFormat("en");
const and = new Intl.ListFormat("en", { type: "conjunction" });

export const formatCount = (value: number) => number.format(value);
export const listAnd = (items: string[]) => and.format(items);

export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}
