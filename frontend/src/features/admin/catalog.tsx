"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { useData } from "@/lib/use-data";
import type { Book } from "@/lib/types";
import { api } from "@/lib/api";
import { useApp } from "@/components/provider";
import { Cover } from "@/components/book-card";
import { Loading, Empty, Modal } from "@/components/ui";
const blank = {
  id: "",
  title: "",
  author: "",
  description: "",
  genre: "Fiction",
  mood: "Thoughtful",
  pace: "Medium",
  level: "Beginner",
  pages: 200,
  year: 2026,
  isbn: "",
  language: "eng",
  tags: [] as string[],
};
export default function CatalogAdmin() {
  const { data, error, loading, reload } = useData<{ books: Book[] }>(
    "admin/overview",
  );
  const { notify } = useApp();
  const [form, setForm] = useState<typeof blank | null>(null),
    [busy, setBusy] = useState(false),
    [tagText, setTagText] = useState("");
  useEffect(() => {
    setTagText(form?.tags.join(", ") || "");
  }, [form?.id]);
  const update = async () => {
    if (!form) return;
    setBusy(true);
    try {
      const { id, ...payload } = form;
      payload.tags = tagText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await api(`admin/books/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setForm(null);
      reload();
      notify(
        "Catalog metadata saved. New books need copies before they show as available.",
      );
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
          <span className="eyebrow">THE DETAILS MAKE THE DIFFERENCE</span>
          <h1>
            Care for the <em>catalog.</em>
          </h1>
          <p>
            Review descriptions, correct edition metadata, and add new works.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => setForm({ ...blank, tags: [] })}
        >
          <Plus size={15} /> Add a book
        </button>
      </div>
      <nav className="staff-nav">
        <Link href="/admin">Inventory</Link>
        <Link href="/admin/catalog" className="active">
          Catalog
        </Link>
        <Link href="/admin/insights">Library insights</Link>
      </nav>
      {loading ? (
        <Loading />
      ) : error ? (
        <Empty title="Staff access required" text={error} />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Work</th>
                <th>Genre</th>
                <th>Edition</th>
                <th>Provenance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.books.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="admin-title-cell">
                      <Cover book={b} />
                      <div>
                        <strong>{b.title}</strong>
                        <small>{b.author}</small>
                      </div>
                    </div>
                  </td>
                  <td>{b.genre}</td>
                  <td>
                    {b.language.toUpperCase()} · {b.pages} pages
                  </td>
                  <td>
                    <small>{b.source}</small>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() =>
                        setForm({
                          id: b.id,
                          title: b.title,
                          author: b.author,
                          description: b.description,
                          genre: b.genre,
                          mood: b.mood,
                          pace: b.pace,
                          level: b.level,
                          pages: b.pages,
                          year: b.year,
                          isbn: b.isbn,
                          language: b.language,
                          tags: b.tags,
                        })
                      }
                    >
                      Edit <ArrowUpRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={!!form}
        onOpenChange={(v) => {
          if (!v) setForm(null);
        }}
        title="Book & edition metadata"
      >
        {form && (
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              update();
            }}
          >
            <label>
              Work ID
              <input
                required
                pattern="[a-z0-9-]+"
                maxLength={120}
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="a-short-book-id"
              />
            </label>
            <label>
              Title
              <input
                required
                value={form.title}
                maxLength={250}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Author
              <input
                required
                value={form.author}
                maxLength={200}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                required
                minLength={10}
                maxLength={3000}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <div className="preferences-fields">
              <label>
                Genre
                <select
                  value={form.genre}
                  onChange={(e) => setForm({ ...form, genre: e.target.value })}
                >
                  {[
                    "Fiction",
                    "Fantasy",
                    "Science fiction",
                    "Mystery",
                    "Technology",
                    "Science",
                    "Design",
                    "Psychology",
                    "History",
                    "Personal growth",
                    "Memoir",
                    "Engineering",
                    "Mathematics",
                  ].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label>
                Language
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm({ ...form, language: e.target.value })
                  }
                >
                  <option value="eng">English</option>
                  <option value="hin">Hindi</option>
                </select>
              </label>
            </div>
            <div className="preferences-fields">
              <label>
                Pages
                <input
                  type="number"
                  required
                  min={1}
                  max={10000}
                  value={form.pages}
                  onChange={(e) =>
                    setForm({ ...form, pages: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Publication year
                <input
                  type="number"
                  required
                  min={1}
                  max={2100}
                  value={form.year}
                  onChange={(e) =>
                    setForm({ ...form, year: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <label>
              ISBN (optional)
              <input
                maxLength={20}
                pattern="[0-9Xx-]*"
                value={form.isbn}
                onChange={(e) => setForm({ ...form, isbn: e.target.value })}
              />
            </label>
            <div className="preferences-fields">
              <label>
                Mood
                <input
                  required
                  maxLength={40}
                  value={form.mood}
                  onChange={(e) => setForm({ ...form, mood: e.target.value })}
                />
              </label>
              <label>
                Pace
                <select
                  value={form.pace}
                  onChange={(e) => setForm({ ...form, pace: e.target.value })}
                >
                  {["Slow", "Medium", "Fast"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Level
                <select
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                >
                  {["Beginner", "Intermediate", "Advanced"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Tags, separated with commas
              <input
                value={tagText}
                maxLength={1000}
                onChange={(e) => setTagText(e.target.value)}
              />
            </label>
            <p className="fineprint">
              Saving records staff-supplied metadata. Confirm the edition’s page
              count and language before use. Add physical copies through the
              inventory importer.
            </p>
            <button className="button primary" disabled={busy}>
              {busy ? "Saving…" : "Save metadata"}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
