"use client";
import { use } from "react";
import Link from "next/link";
import { useState } from "react";
import {
  ChevronLeft,
  Bookmark,
  Check,
  ArrowUpRight,
  Scale,
} from "lucide-react";
import { useData } from "@/lib/use-data";
import type { Book } from "@/lib/types";
import { Cover, Evidence, BookCard } from "@/components/book-card";
import { Loading, Empty, Modal } from "@/components/ui";
import { useApp } from "@/components/provider";
export default function BookDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, error, loading } = useData<{ book: Book; similar: Book[] }>(
    `books/${id}`,
  );
  const { shelf, save, remove, notify, toggleCompare } = useApp();
  const [evidence, setEvidence] = useState(false);
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <div className="wrap page">
        <Empty
          title="This book couldn’t be opened"
          text={error || "Try returning to the catalog."}
        />
      </div>
    );
  const b = data.book,
    saved = shelf.some((e) => e.book.id === id);
  return (
    <div className="wrap page">
      <Link className="text-link back-link" href="/discover">
        <ChevronLeft size={15} /> Back to discovery
      </Link>
      <section className="detail-layout">
        <div className="detail-art" style={{ background: `${b.color}20` }}>
          <Cover large book={b} />
          <span className="eyebrow">A BOOK WORTH A CLOSER LOOK</span>
        </div>
        <div className="detail-copy">
          <span className="eyebrow">
            {b.genre} · {b.year}
          </span>
          <h1>{b.title}</h1>
          <p className="detail-author">by {b.author}</p>
          <p className="detail-description">{b.description}</p>
          {b.source_url && (
            <a
              className="text-link"
              href={b.source_url}
              target="_blank"
              rel="noreferrer"
            >
              View the publisher / library record <ArrowUpRight size={14} />
            </a>
          )}
          <div className="detail-facts">
            <span>
              <strong>{b.pages}</strong> pages
            </span>
            <span>
              <strong>{b.pace}</strong> pace
            </span>
            <span>
              <strong>{b.level}</strong> level
            </span>
          </div>
          <div className="chips">
            {b.tags.map((t) => (
              <Link key={t} href={"/search?q=" + encodeURIComponent(t)}>
                {t}
              </Link>
            ))}
          </div>
          <div className="detail-actions">
            <button
              className="button primary"
              onClick={() => {
                (saved ? remove(id) : save(b)).catch((e) => notify(e.message));
              }}
            >
              {saved ? <Check size={16} /> : <Bookmark size={16} />}{" "}
              {saved ? "On your shelf" : "Save to my shelf"}
            </button>
            <Link
              href={
                "/librarian?q=" +
                encodeURIComponent(
                  "More books like " + b.title + ": " + b.tags.join(", "),
                )
              }
              className="button secondary"
            >
              More like this <ArrowUpRight size={16} />
            </Link>
            <button
              className="icon-button"
              aria-label="Compare this book"
              onClick={() => toggleCompare(b)}
            >
              <Scale size={20} />
            </button>
          </div>
          <button className="text-button" onClick={() => setEvidence(true)}>
            Explore its themes and evidence <ArrowUpRight size={15} />
          </button>
        </div>
      </section>
      <section className="inventory-section get-book-section">
        <span className="eyebrow">YOUR NEXT STEP</span>
        <h2>Where to get this book</h2>
        <p>
          Explore a bookstore or look for a library record. These links open
          external search results.
        </p>
        <div className="detail-actions">
          <a
            className="button primary"
            href={
              "https://www.amazon.in/s?k=" +
              encodeURIComponent(b.isbn || `${b.title} ${b.author}`)
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            Find on Amazon India <ArrowUpRight size={15} />
          </a>
          <a
            className="button secondary"
            href={
              "https://openlibrary.org/search?q=" +
              encodeURIComponent(`${b.title} ${b.author}`)
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            Find on Open Library <ArrowUpRight size={15} />
          </a>
        </div>
        <p className="fineprint">
          Check the edition, price, availability, and reading access on the
          external website. ShelfSense recommends books; purchases and reading
          happen with the provider.
        </p>
      </section>
      <section className="book-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">KEEP YOUR CURIOSITY GOING</span>
            <h2>On a similar wavelength.</h2>
          </div>
        </div>
        <div className="book-grid five">
          {data.similar.map((b) => (
            <BookCard book={b} key={b.id} />
          ))}
        </div>
      </section>
      <Modal
        open={evidence}
        onOpenChange={setEvidence}
        title={`About ${b.title}`}
      >
        <Evidence book={b} />
      </Modal>
    </div>
  );
}
