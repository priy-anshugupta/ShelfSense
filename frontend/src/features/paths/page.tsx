"use client";
import Link from "next/link";
import { useData } from "@/lib/use-data";
import type { Book } from "@/lib/types";
import { Cover } from "@/components/book-card";
import { Loading, Empty } from "@/components/ui";
import { ArrowUpRight } from "lucide-react";
export default function PathsPage() {
  const { data, error, loading } = useData<{
    paths: {
      id: string;
      title: string;
      description: string;
      source: string;
      steps: { book: Book; prerequisite: string }[];
    }[];
  }>("paths");
  return (
    <div className="wrap page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ONE GOOD IDEA LEADS TO ANOTHER</span>
          <h1>
            Read toward <em>something.</em>
          </h1>
          <p>
            Thoughtful starting points for the things you want to understand.
          </p>
        </div>
        <Link
          className="button secondary"
          href="/librarian?q=Help%20me%20find%20a%20beginner-friendly%20book%20for%20my%20learning%20goal"
        >
          Ask about your goal <ArrowUpRight size={16} />
        </Link>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <Empty title="The reading paths couldn’t open" text={error} />
      ) : (
        <div className="path-grid">
          {data?.paths.map((p, i) => (
            <article className="path-card" key={p.id}>
              <span className="eyebrow">
                PATH {String(i + 1).padStart(2, "0")} · {p.steps.length} STEPS
              </span>
              <h2>{p.title}</h2>
              <p>{p.description}</p>
              <div className="path-steps">
                {p.steps.map((s, n) => (
                  <Link
                    href={"/books/" + s.book.id}
                    className="path-step"
                    key={s.book.id}
                  >
                    <Cover book={s.book} />
                    <div>
                      <span className="eyebrow">STEP {n + 1}</span>
                      <strong>{s.book.title}</strong>
                      <small>{s.prerequisite}</small>
                    </div>
                    <ArrowUpRight size={13} />
                  </Link>
                ))}
              </div>
              <p className="fineprint">{p.source}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
