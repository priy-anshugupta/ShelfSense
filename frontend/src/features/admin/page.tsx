"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Upload, Download, ArrowUpRight, Search, Check } from "lucide-react";
import { useData } from "@/lib/use-data";
import { api } from "@/lib/api";
import type { Book } from "@/lib/types";
import { Cover } from "@/components/book-card";
import { useApp } from "@/components/provider";
import { Loading, Empty, Modal } from "@/components/ui";
type Preview = {
  id: string;
  valid: number;
  invalid: number;
  rows: { row: number; data: Record<string, string>; errors: string[] }[];
};
export default function AdminPage() {
  const importPage = usePathname() === "/admin/imports";
  const { data, error, loading, reload } = useData<{
    books: Book[];
    works: number;
    copies: number;
    available: number;
    imports: number;
    demo: boolean;
  }>("admin/overview");
  const { notify } = useApp();
  const [q, setQ] = useState(""),
    [open, setOpen] = useState(false),
    [preview, setPreview] = useState<Preview | null>(null),
    [busy, setBusy] = useState(false),
    [importError, setImportError] = useState("");
  const update = async (id: string, status: string) => {
    try {
      await api(`admin/copies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      reload();
      notify("Copy status updated.");
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const upload = async (file: File) => {
    setBusy(true);
    setImportError("");
    try {
      const f = new FormData();
      f.append("file", file);
      setPreview(
        await api<Preview>("admin/imports/preview", {
          method: "POST",
          body: f,
        }),
      );
    } catch (e) {
      setImportError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const commit = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await api(`admin/imports/${preview.id}/commit`, { method: "POST" });
      setOpen(false);
      setPreview(null);
      reload();
      notify("Reviewed inventory rows imported.");
    } catch (e) {
      setImportError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const template = () => {
    const csv =
      "copy_id,work_id,branch,location,status\nDEMO-NEW-001,midnight-library,Central Library,Fiction Bay 1 Shelf 2,available\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "shelfsense-inventory-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  if (error)
    return (
      <div className="wrap page">
        <Empty title="Library staff access required" text={error} />
      </div>
    );
  return (
    <div className={"wrap page " + (importPage ? "imports-page" : "")}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BEHIND EVERY GOOD LIBRARY</span>
          <h1>
            {importPage ? (
              <>
                Bring your copies <em>together.</em>
              </>
            ) : (
              <>
                Keep every copy <em>current.</em>
              </>
            )}
          </h1>
          <p>
            {importPage
              ? "Preview, validate, and import inventory with confidence."
              : "Accurate availability starts with well-kept copy records."}
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setOpen(true);
            setImportError("");
          }}
        >
          <Upload size={15} /> Import inventory
        </button>
      </div>
      <nav className="staff-nav">
        <Link href="/admin" className="active">
          Inventory
        </Link>
        <Link href="/admin/catalog">Catalog</Link>
        <Link href="/admin/insights">Library insights</Link>
      </nav>
      {importPage && (
        <section className="import-guide">
          <div>
            <span>01</span>
            <h3>Start with the template</h3>
            <p>
              Use stable copy IDs and existing work IDs. Add new titles to the
              catalog first.
            </p>
            <button className="text-button" onClick={template}>
              Download template <Download size={14} />
            </button>
          </div>
          <div>
            <span>02</span>
            <h3>Review before importing</h3>
            <p>
              Upload a UTF-8 CSV, up to 1 MB. Each row is checked for valid
              branch, status, and catalog mapping.
            </p>
          </div>
          <div>
            <span>03</span>
            <h3>Commit valid rows</h3>
            <p>
              Only reviewed valid rows update inventory. Repeated commits do not
              duplicate copies.
            </p>
          </div>
        </section>
      )}
      {data?.demo && (
        <div className="callout">
          <strong>Demonstration library</strong>Staff tools are open locally to
          demonstrate the workflow. In production, access is restricted to
          configured librarian accounts.
        </div>
      )}
      {loading && !data ? (
        <Loading />
      ) : (
        <>
          <div className="admin-stats">
            {[
              ["Works", data?.works],
              ["Physical copies", data?.copies],
              ["Verified available", data?.available],
              ["Import previews", data?.imports],
            ].map(([label, n]) => (
              <div key={label}>
                <strong>{n}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="admin-toolbar">
            <div>
              <h2>Catalog & inventory</h2>
              <p className="fineprint">
                Work → edition → copy. Sample inventory is labeled throughout.
              </p>
            </div>
            <input
              aria-label="Filter inventory"
              placeholder="Filter titles or authors…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Edition</th>
                  <th>Branch & shelf</th>
                  <th>Copy status</th>
                  <th>Observed</th>
                </tr>
              </thead>
              <tbody>
                {data?.books
                  .filter((b) =>
                    (b.title + " " + b.author)
                      .toLowerCase()
                      .includes(q.toLowerCase()),
                  )
                  .flatMap((b) =>
                    b.copies.map((c, i) => (
                      <tr key={c.id}>
                        <td>
                          <div className="admin-title-cell">
                            <Cover book={b} />
                            <div>
                              <Link href={"/books/" + b.id}>
                                <strong>
                                  {b.title}{" "}
                                  <ArrowUpRight
                                    size={11}
                                    style={{ display: "inline" }}
                                  />
                                </strong>
                              </Link>
                              <small>{b.author}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          {c.language.toUpperCase()}
                          <br />
                          <small>{c.pages} pages</small>
                        </td>
                        <td>
                          <strong>{c.branch}</strong>
                          <small>{c.location}</small>
                        </td>
                        <td>
                          <select
                            aria-label={`Status of ${c.id}`}
                            value={c.status === "stale" ? "unknown" : c.status}
                            onChange={(e) => update(c.id, e.target.value)}
                          >
                            {[
                              "available",
                              "checked_out",
                              "reference_only",
                              "maintenance",
                              "lost",
                              "unknown",
                            ].map((s) => (
                              <option key={s} value={s}>
                                {s.replaceAll("_", " ")}
                              </option>
                            ))}
                          </select>
                          {c.status === "stale" && (
                            <small className="inventory-stale-note">
                              Stale · last observed{" "}
                              {c.observed_status?.replaceAll("_", " ") ||
                                "unknown"}
                            </small>
                          )}
                        </td>
                        <td>
                          <small>
                            {new Date(c.updated_at).toLocaleDateString()}
                          </small>
                        </td>
                      </tr>
                    )),
                  )}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Modal open={open} onOpenChange={setOpen} title="Import library copies">
        <p className="muted" style={{ fontSize: 12, marginBottom: 15 }}>
          Upload a UTF-8 CSV. We’ll validate each row before changing the
          inventory. This importer updates copies of existing catalog works.
        </p>
        <button
          className="text-button"
          onClick={template}
          style={{ marginBottom: 20 }}
        >
          <Download size={14} /> Download CSV template
        </button>
        <input
          className="upload-input"
          aria-label="Upload inventory CSV"
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => {
            if (e.target.files?.[0]) upload(e.target.files[0]);
          }}
        />
        {busy && <p role="status">Checking your file…</p>}
        {importError && (
          <p className="inline-error" role="alert">
            {importError}
          </p>
        )}
        {preview && (
          <>
            <div className="import-summary">
              <span>
                <Check size={13} style={{ display: "inline" }} />{" "}
                {preview.valid} valid rows
              </span>
              <span>{preview.invalid} rows need attention</span>
            </div>
            <div className="table-scroll import">
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Copy</th>
                    <th>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.row}>
                      <td>{r.row}</td>
                      <td>{r.data.copy_id}</td>
                      <td className={r.errors.length ? "import-errors" : ""}>
                        {r.errors.join("; ") || "Ready to import"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="button primary"
              disabled={!preview.valid || busy}
              onClick={commit}
            >
              Import {preview.valid} reviewed rows
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}
