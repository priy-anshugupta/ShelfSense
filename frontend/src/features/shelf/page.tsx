"use client";
import { useState } from "react";
import Link from "next/link";
import { Bookmark, ArrowUpRight, Trash2, Star } from "lucide-react";
import { useApp } from "@/components/provider";
import { Cover } from "@/components/book-card";
import { Empty, Modal, Loading } from "@/components/ui";
import { api } from "@/lib/api";
import type { Entry } from "@/lib/types";
const statuses = [
  ["all", "All books"],
  ["want_to_read", "Up next"],
  ["reading", "Reading"],
  ["finished", "Finished"],
  ["stopped", "Set aside"],
];
export default function ShelfPage() {
  const { shelf, save, remove, refresh, notify, config, ready, serviceError } = useApp();
  const [tab, setTab] = useState("all"),
    [edit, setEdit] = useState<Entry | null>(null),
    [busy, setBusy] = useState(false);
  const shown = shelf.filter((e) => tab === "all" || e.status === tab);
  const finished = shelf.filter((e) => e.status === "finished").length;
  if (!ready) return <Loading />;
  if (serviceError) return <div className="wrap page"><Empty title="Your shelf couldn’t open" text={serviceError}/></div>;
  const update = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      await api(`me/shelf/${edit.book.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: shelf.find(entry => entry.book.id === edit.book.id)?.status || edit.status,
          rating: edit.rating,
          progress: edit.progress,
          note: edit.note,
        }),
      });
      await refresh();
      setEdit(null);
      notify("Your reading notes are saved.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="wrap page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A COLLECTION THAT FEELS LIKE YOU</span>
          <h1>
            Your own little <em>library.</em>
          </h1>
          <p>
            Books for now, books for later, and the ones that stay with you.
          </p>
        </div>
        <Link className="button secondary" href="/discover">
          Find another favorite <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="shelf-summary">
        <div>
          <span>{shelf.length}</span>
          <p>books on your shelf</p>
        </div>
        <div>
          <span>{shelf.filter((e) => e.status === "reading").length}</span>
          <p>currently reading</p>
        </div>
        <div>
          <span>{finished}</span>
          <p>books finished</p>
        </div>
        <div className="shelf-summary-note">
          <Bookmark size={24} strokeWidth={1.2} />
          <p>
            {config?.owner_type === "user" || config?.owner_type === "local"
              ? "Saved to your account."
              : "Saved privately for this browser. Sign in for an account shelf."}
          </p>
        </div>
      </div>
      <div className="shelf-tabs" role="group" aria-label="Shelf status">
        {statuses.map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
            <span>
              {id === "all"
                ? shelf.length
                : shelf.filter((e) => e.status === id).length}
            </span>
          </button>
        ))}
      </div>
      {!shown.length ? (
        <Empty
          title="Make room for your next chapter"
          text="Save a book while exploring. It will be waiting for you here."
        >
          <Link className="button primary" href="/discover">
            Explore the library <ArrowUpRight size={16} />
          </Link>
        </Empty>
      ) : (
        <div className="shelf-grid">
          {shown.map((e) => (
            <article className="shelf-card" key={e.book.id}>
              <Link href={"/books/" + e.book.id}>
                <Cover book={e.book} />
              </Link>
              <div>
                <span className="eyebrow">{e.book.genre}</span>
                <Link className="book-title" href={"/books/" + e.book.id}>
                  {e.book.title}
                </Link>
                <p className="book-author">{e.book.author}</p>
                <select
                  aria-label={`Reading status for ${e.book.title}`}
                  value={e.status}
                  onChange={(v) =>
                    save(e.book, v.target.value).catch((err) =>
                      notify(err.message),
                    )
                  }
                >
                  {statuses.slice(1).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                {e.status === "reading" && (
                  <div className="progress-track">
                    <div style={{ width: e.progress + "%" }} />
                    <span>{e.progress}% read</span>
                  </div>
                )}
                {e.rating && (
                  <p className="rating">
                    {"★".repeat(e.rating)}
                    {"☆".repeat(5 - e.rating)}
                  </p>
                )}
                <div className="shelf-actions">
                  <button
                    className="text-button"
                    onClick={() => setEdit({ ...e })}
                  >
                    <Star size={13} /> Notes & progress
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${e.book.title}`}
                    onClick={() =>
                      remove(e.book.id).catch((err) => notify(err.message))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal
        open={!!edit}
        onOpenChange={(v) => {
          if (!v) setEdit(null);
        }}
        title="Your reading journal"
      >
        {edit && (
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              update();
            }}
          >
            <h3>{edit.book.title}</h3>
            <label>
              Progress: {edit.progress}%
              <input
                type="range"
                min="0"
                max="100"
                value={edit.progress}
                onChange={(e) =>
                  setEdit({ ...edit, progress: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Your rating
              <select
                value={edit.rating || ""}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    rating: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">Not rated</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
            </label>
            <label>
              Private notes
              <textarea
                value={edit.note}
                onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                placeholder="A thought, a favorite moment, a reason to return…"
                maxLength={3000}
              />
            </label>
            <button className="button primary" disabled={busy}>
              {busy ? "Saving…" : "Save journal"}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
