"use client";
import { use } from "react";
import Link from "next/link";
import { useState } from "react";
import {
  ChevronLeft,
  Bookmark,
  Check,
  MapPin,
  ArrowUpRight,
  Scale,
  Copy as CopyIcon,
} from "lucide-react";
import { useData } from "@/lib/use-data";
import type { Book } from "@/lib/types";
import {
  Cover,
  Availability,
  Evidence,
  BookCard,
} from "@/components/book-card";
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
  const [evidence, setEvidence] = useState(false),
    [branch, setBranch] = useState(""),
    [edition, setEdition] = useState("");
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
  const copies = b.copies.filter(
    (c) =>
      (!branch || c.branch === branch) &&
      (!edition || c.edition_id === edition),
  );
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
          <Availability book={b} />
          <p className="detail-description">{b.description}</p>
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
      <section className="inventory-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FROM DISCOVERY TO THE FIRST PAGE</span>
            <h2>Find it in the library.</h2>
            <p>
              Sample copies and shelf locations · updated status shown below.
            </p>
          </div>
          <div className="inventory-filters">
            <select
              aria-label="Select an edition"
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
            >
              <option value="">All editions</option>
              {b.editions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.language.toUpperCase()} · {e.pages || "Unknown"} pages ·{" "}
                  {e.isbn}
                </option>
              ))}
            </select>
            <select
              aria-label="Select a branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="">All branches</option>
              <option>Central Library</option>
              <option>Study Annex</option>
            </select>
          </div>
        </div>
        {copies.length ? (
          <div className="inventory-cards">
            {copies.map((c) => (
              <div className="inventory-card" key={c.id}>
                <MapPin size={22} strokeWidth={1.4} />
                <div>
                  <h3>{c.branch}</h3>
                  <p>{c.location}</p>
                  <small>
                    Updated {new Date(c.updated_at).toLocaleString()}
                  </small>
                </div>
                <span
                  className={
                    "status-pill " +
                    (c.status === "available" ? "positive" : "")
                  }
                >
                  {c.status.replaceAll("_", " ")}
                </span>
                <button
                  className="icon-button"
                  aria-label="Copy shelf location"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(`${b.title} · ${c.branch} · ${c.location}`)
                      .then(() => notify("Shelf location copied."))
                      .catch(() =>
                        notify("Could not copy; the location is shown above."),
                      )
                  }
                >
                  <CopyIcon size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="No copies in this selection"
            text="Try another branch or edition. Availability is never inferred from book descriptions."
          />
        )}
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
