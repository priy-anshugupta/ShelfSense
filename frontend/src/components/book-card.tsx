"use client";
import Link from "next/link";
import { useState } from "react";
import { Bookmark, Check, Plus, ArrowUpRight, Scale } from "lucide-react";
import type { Book } from "@/lib/types";
import { useApp } from "./provider";
import { Modal } from "./ui";
export function Cover({
  book,
  large = false,
}: {
  book: Book;
  large?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={"cover " + (large ? "large" : "")}
      style={{ "--cover-color": book.color } as React.CSSProperties}
    >
      {!broken ? (
        <img
          src={`/images/covers/${book.id}.jpg`}
          alt={`Cover of ${book.title}`}
          onError={() => setBroken(true)}
          loading={large ? "eager" : "lazy"}
          decoding="async"
        />
      ) : (
        <div className="cover-fallback">
          <span>{book.author}</span>
          <strong>{book.title}</strong>
          <BookMark />
          <small>Cover unavailable</small>
        </div>
      )}
    </div>
  );
}
function BookMark() {
  return <div className="cover-line" />;
}
export function Availability({ book }: { book: Book }) {
  return (
    <span className={"availability " + (book.available ? "yes" : "no")}>
      <span />
      {book.available
        ? "Available in library"
        : book.availability === "checked_out"
          ? "Currently checked out"
          : "Availability unverified"}
    </span>
  );
}
export function Evidence({ book }: { book: Book }) {
  return (
    <div className="evidence-content">
      <p className="muted">
        Reasons are based on catalog metadata and your active request. They are
        not a probability that you will enjoy the book.
      </p>
      {(
        book.reasons || [`${book.genre} · ${book.mood} · ${book.pace} pace`]
      ).map((r) => (
        <div className="reason-row" key={r}>
          <Check size={16} />
          {r}
        </div>
      ))}
      {book.tradeoff && (
        <div className="callout">
          <strong>What to know</strong>
          <p>{book.tradeoff}</p>
        </div>
      )}
      {(
        book.evidence || [
          {
            field: "description",
            value: book.description,
            source: book.source,
          },
          {
            field: "attributes",
            value: book.tags.join(", "),
            source: "Project-curated demonstration tags",
          },
        ]
      ).map((e) => (
        <div className="evidence-row" key={e.field}>
          <span className="eyebrow">{e.field.replaceAll("_", " ")}</span>
          <p>{e.value}</p>
          <small>{e.source}</small>
        </div>
      ))}
      <p className="fineprint">
        Edition metadata and attributes are a curated demonstration dataset.
        Verify them before real-library use.
      </p>
    </div>
  );
}
export function BookCard({
  book,
  recommendation = false,
  onRefine,
}: {
  book: Book;
  recommendation?: boolean;
  onRefine?: (text: string, id?: string) => void;
}) {
  const { shelf, save, remove, notify, toggleCompare, compare } = useApp();
  const saved = shelf.some((e) => e.book.id === book.id);
  const [evidence, setEvidence] = useState(false),
    [busy, setBusy] = useState(false);
  const bookmark = async () => {
    setBusy(true);
    try {
      if (saved) await remove(book.id);
      else await save(book);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article
      className={recommendation ? "book-card recommendation-card" : "book-card"}
    >
      <div className="book-art" style={{ background: `${book.color}16` }}>
        <Link
          href={`/books/${book.id}`}
          aria-label={`Read about ${book.title}`}
        >
          <Cover book={book} />
        </Link>
        <button
          className={"save-book " + (saved ? "saved" : "")}
          disabled={busy}
          aria-label={
            saved ? `Remove ${book.title} from shelf` : `Save ${book.title}`
          }
          onClick={bookmark}
        >
          {saved ? <Check size={17} /> : <Bookmark size={17} />}
        </button>
      </div>
      <div className="book-info">
        <div className="book-genre">
          {book.genre}
          {recommendation && <span>{book.pages} pages</span>}
        </div>
        <Link href={`/books/${book.id}`} className="book-title">
          {book.title}
        </Link>
        <p className="book-author">{book.author}</p>
        {recommendation && <p className="book-reason">{book.reasons?.[0]}</p>}
        {recommendation && (
          <>
            <button
              className="text-button why-button"
              onClick={() => setEvidence(true)}
            >
              Why this book? <ArrowUpRight size={14} />
            </button>
            <div className="refine-row">
              <button
                onClick={() =>
                  onRefine?.(
                    `More like ${book.title}: ${book.tags.slice(0, 3).join(", ")}`,
                  )
                }
              >
                <Plus size={12} /> More like this
              </button>
              <button
                onClick={() =>
                  onRefine?.("I have already read this one.", book.id)
                }
              >
                Already read
              </button>
            </div>
          </>
        )}
        <button
          className={
            "compare-link " +
            (compare.some((b) => b.id === book.id) ? "selected" : "")
          }
          onClick={() => toggleCompare(book)}
        >
          <Scale size={12} />
          {compare.some((b) => b.id === book.id)
            ? "Selected for comparison"
            : "Compare"}
        </button>
      </div>
      <Modal
        open={evidence}
        onOpenChange={setEvidence}
        title={`Why ${book.title}?`}
      >
        <Evidence book={book} />
      </Modal>
    </article>
  );
}
