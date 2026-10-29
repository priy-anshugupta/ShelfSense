"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import { useData } from "@/lib/use-data";
import { Loading, Empty } from "@/components/ui";

type WebBook = {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  url: string;
  thumbnail: string;
  source: string;
};
type WebResults = {
  books: WebBook[];
  query: string;
  cached: boolean;
  notice: string;
};

export function WebBookSearch({ query }: { query: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);
  return (
    <div className="wrap page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">BEYOND THE CATALOG</span>
          <h1>
            Find your next <em>discovery.</em>
          </h1>
          <p>Search books across Google Play Books, powered by SerpAPI.</p>
        </div>
      </div>
      <nav className="search-source-tabs" aria-label="Search source">
        <Link href={"/search?q=" + encodeURIComponent(query)}>Catalog</Link>
        <Link
          aria-current="page"
          href={"/search?source=web&q=" + encodeURIComponent(query)}
        >
          Search the web
        </Link>
      </nav>
      <form
        className="catalog-search"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim())
            router.push(
              "/search?source=web&q=" + encodeURIComponent(draft.trim()),
            );
        }}
      >
        <Search size={20} />
        <input
          aria-label="Search the web for books"
          maxLength={300}
          placeholder="A book title, author, or topic…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="button primary" disabled={!draft.trim()}>
          Search the web
        </button>
      </form>
      <p className="fineprint web-search-notice">
        Your search text is sent to SerpAPI. Results are external listings,
        separate from your curated catalog and shelf. Confirm the edition and
        reading or purchase options on the provider’s site.
      </p>
      {query.trim() ? (
        <WebResultsList key={query} query={query} />
      ) : (
        <Empty
          title="A wider world of books"
          text="Enter a title, author, or subject to search beyond the local catalog."
        />
      )}
    </div>
  );
}
function WebResultsList({ query }: { query: string }) {
  const { data, loading, error, reload } = useData<WebResults>(
    "web-search?q=" + encodeURIComponent(query),
  );
  if (loading) return <Loading />;
  if (error)
    return (
      <Empty title="Web search couldn’t finish" text={error}>
        <button className="button secondary" onClick={reload}>
          Try again
        </button>
        <Link
          className="text-link"
          href={"/search?q=" + encodeURIComponent(query)}
        >
          Search the catalog instead
        </Link>
      </Empty>
    );
  if (!data?.books.length)
    return (
      <Empty
        title="No external books found"
        text="Try a shorter topic, an author’s name, or an exact book title."
      />
    );
  return (
    <section aria-label="Web book results">
      <div className="section-heading compact">
        <h2>
          {data.books.length} web results for “{query}”
        </h2>
        <span className="fineprint">
          Google Play Books ·{" "}
          {data.cached ? "Recently retrieved" : "Live search"}
        </span>
      </div>
      <div className="web-books-grid">
        {data.books.map((book) => (
          <article className="web-book-card" key={book.id}>
            <div className="web-book-cover">
              {book.thumbnail ? (
                <img
                  src={book.thumbnail}
                  alt={"Cover of " + book.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <BookOpen size={36} />
              )}
            </div>
            <div>
              <span className="eyebrow">WEB RESULT · {book.source}</span>
              <h3>
                <a href={book.url} target="_blank" rel="noopener noreferrer">
                  {book.title}
                </a>
              </h3>
              <p className="book-author">{book.author}</p>
              {book.category && (
                <span className="web-book-category">{book.category}</span>
              )}
              {book.description && (
                <p className="web-book-description">{book.description}</p>
              )}
              <a
                className="text-link"
                href={book.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Google Play Books <ArrowUpRight size={14} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
