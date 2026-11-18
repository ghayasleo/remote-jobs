import { faqJsonLd, type Faq } from "@/lib/faq";
import { jsonLd } from "@/lib/site";

/** Short questions and answers, with FAQPage markup for search engines. */
export function FaqSection({ faqs, className }: { faqs: Faq[]; className?: string }) {
  if (faqs.length === 0) return null;
  return (
    <section aria-labelledby="questions" className={className}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqJsonLd(faqs))} />
      <h2 id="questions" className="text-base font-bold tracking-tight">
        Questions
      </h2>
      <dl className="mt-3 divide-y rounded-2xl border">
        {faqs.map(({ question, answer }) => (
          <div key={question} className="px-4 py-3.5 sm:px-5">
            <dt className="font-semibold text-pretty">{question}</dt>
            <dd className="mt-1 max-w-[38rem] text-sm leading-relaxed text-pretty text-foreground/85">{answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
