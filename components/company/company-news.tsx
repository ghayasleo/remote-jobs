import { NEWS_TAGS } from "@/lib/news";
import type { NewsItem } from "@/lib/data/company-news";
import { formatDate } from "@/lib/format";
import { Tag } from "@/components/company/chips";

const number = new Intl.NumberFormat("en");

/** "In the news": headlines from the company's own blog and Hacker News, each linking to the original. */
export function CompanyNews({ name, items }: { name: string; items: NewsItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="news-title">
      <h2 id="news-title" className="text-lg font-bold tracking-tight">
        In the news
      </h2>
      <p className="mt-0.5 mb-3 text-sm text-muted-foreground">
        From {name}’s own posts and Hacker News, newest first.
      </p>
      <ul className="divide-y rounded-2xl border">
        {items.map((item) => (
          <li key={item.url} className="px-4 py-3.5 sm:px-5">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-pretty underline-offset-4 hover:underline"
            >
              {item.title}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              <span>{item.site || (item.source === "blog" ? `${name}’s blog` : "Hacker News")}</span>
              {item.date && (
                <>
                  <span aria-hidden>·</span>
                  <time dateTime={item.date}>{formatDate(item.date)}</time>
                </>
              )}
              {item.hn && (
                <>
                  <span aria-hidden>·</span>
                  <a href={item.hn.discussion} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                    {number.format(item.hn.points)} points, {number.format(item.hn.comments)} comments on Hacker News
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </>
              )}
            </p>
            {item.tags.length > 0 && (
              <ul aria-label="Topics" className="mt-2 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <li key={tag}>
                    <Tag>{NEWS_TAGS[tag]}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
