"use client";
import Link from "next/link";
import { X, ArrowUpRight } from "lucide-react";
import { useApp } from "@/components/provider";
import { Cover, Availability } from "@/components/book-card";
import { Empty } from "@/components/ui";
export default function ComparePage() {
  const { compare, toggleCompare } = useApp();
  return (
    <div className="wrap page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A CLOSER LOOK, SIDE BY SIDE</span>
          <h1>
            A thoughtful <em>choice.</em>
          </h1>
          <p>Compare the things that matter for your next read.</p>
        </div>
      </div>
      {!compare.length ? (
        <Empty
          title="A few possibilities to weigh"
          text="Select Compare on up to three book cards to see their differences here."
        >
          <Link className="button primary" href="/discover">
            Find your possibilities <ArrowUpRight size={16} />
          </Link>
        </Empty>
      ) : (
        <div className="compare-grid">
          {compare.map((b) => (
            <article key={b.id} className="compare-card">
              <button
                className="icon-button compare-remove"
                aria-label={`Remove ${b.title} from comparison`}
                onClick={() => toggleCompare(b)}
              >
                <X size={16} />
              </button>
              <Cover book={b} />
              <h2>{b.title}</h2>
              <p>{b.author}</p>
              <dl>
                {[
                  ["Genre", b.genre],
                  ["Mood", b.mood],
                  ["Pace", b.pace],
                  ["Length", `${b.pages} pages`],
                  ["Difficulty", b.level],
                  ["Themes", b.tags.join(", ")],
                  [
                    "What to know",
                    b.tradeoff || "Attributes are project-curated.",
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <Availability book={b} />
              <Link className="button primary" href={"/books/" + b.id}>
                Take a closer look <ArrowUpRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
