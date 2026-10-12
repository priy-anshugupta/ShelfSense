"use client";
import Link from "next/link";
import {
  BookOpen,
  Library,
  Check,
  Users,
  ArrowUpRight,
  Upload,
  Workflow,
  Clock3,
  AlertCircle,
} from "lucide-react";
import { useData } from "@/lib/use-data";
import { Loading, Empty } from "@/components/ui";
type Overview = {
  works: number;
  copies: number;
  available: number;
  accounts: number;
  imports: number;
  demo: boolean;
  stale: number;
  genres: Record<string, number>;
  recent_activity: {
    action: string;
    detail: Record<string, unknown>;
    timestamp: string;
  }[];
  agents: {
    configured: boolean;
    roles: { id: string; name: string; role: string }[];
  };
};
export default function AdminOverview() {
  const { data, error, loading } = useData<Overview>("admin/overview");
  if (loading) return <Loading />;
  if (error || !data)
    return <Empty title="Library access required" text={error} />;
  return (
    <div className="page admin-overview">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">A CLEAR VIEW OF YOUR COLLECTION</span>
          <h1>
            The library, <em>at a glance.</em>
          </h1>
          <p>Keep the collection current and discovery effortless.</p>
        </div>
        <Link href="/admin/imports" className="button primary">
          <Upload size={16} /> Import copies
        </Link>
      </div>
      {data.demo && (
        <div className="demo-notice">
          <BookOpen size={17} />
          <span>
            <strong>Demo library</strong> Sample inventory is separate from a
            real college collection.
          </span>
          <Link href="/about">
            About the project <ArrowUpRight size={13} />
          </Link>
        </div>
      )}
      <div className="workspace-stat-grid">
        {[
          [BookOpen, data.works, "Catalog titles", "Works in the collection"],
          [
            Library,
            data.copies,
            "Physical copies",
            "Across both library branches",
          ],
          [
            Check,
            data.available,
            "Available now",
            "Fresh, borrowable copy records",
          ],
          [
            Users,
            data.accounts,
            "Reader accounts",
            "Local accounts created here",
          ],
        ].map(([Icon, value, title, note]) => {
          const I = Icon as typeof BookOpen;
          return (
            <div key={String(title)}>
              <div>
                <span>{String(title)}</span>
                <I size={20} strokeWidth={1.5} />
              </div>
              <strong>{String(value)}</strong>
              <small>{String(note)}</small>
            </div>
          );
        })}
      </div>
      <div className="workspace-main-grid">
        <section className="workspace-panel">
          <div className="workspace-panel-heading">
            <div>
              <h2>A balanced bookshelf</h2>
              <p>Titles by category</p>
            </div>
            <Link href="/admin/catalog" className="text-button">
              View catalog <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="genre-bars">
            {Object.entries(data.genres)
              .sort((a, b) => b[1] - a[1])
              .map(([genre, count]) => (
                <div key={genre}>
                  <span>{genre}</span>
                  <div>
                    <i
                      style={{
                        width:
                          Math.max(4, (count / data.works) * 100 * 3) + "%",
                      }}
                    />
                  </div>
                  <strong>{count}</strong>
                </div>
              ))}
          </div>
        </section>
        <section className="workspace-panel inventory-health">
          <div className="workspace-panel-heading">
            <div>
              <h2>Collection health</h2>
              <p>Reliable records make better discoveries.</p>
            </div>
            <Check size={19} />
          </div>
          <div className="health-number">
            <strong>
              {Math.round((data.available / Math.max(data.copies, 1)) * 100)}
              <span>%</span>
            </strong>
            <p>
              of copies are verified
              <br />
              available to read
            </p>
          </div>
          <div className="health-row">
            <Clock3 size={15} />
            <span>Stale inventory records</span>
            <strong>{data.stale}</strong>
          </div>
          <div className="health-row">
            <Upload size={15} />
            <span>Import previews</span>
            <strong>{data.imports}</strong>
          </div>
          {data.stale > 0 && (
            <p className="health-warning">
              <AlertCircle size={14} />
              Refresh copy statuses before relying on availability.
            </p>
          )}
          <Link href="/admin/inventory" className="button secondary">
            Review inventory <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <div className="workspace-main-grid lower">
        <section className="workspace-panel">
          <div className="workspace-panel-heading">
            <div>
              <h2>Recent library activity</h2>
              <p>Catalog edits and inventory changes.</p>
            </div>
          </div>
          {data.recent_activity.length ? (
            <div className="audit-list">
              {data.recent_activity.map((e, i) => (
                <div key={i}>
                  <span className="audit-icon">
                    {e.action === "catalog_updated" ? (
                      <BookOpen size={15} />
                    ) : (
                      <Library size={15} />
                    )}
                  </span>
                  <div>
                    <strong>{e.action.replaceAll("_", " ")}</strong>
                    <small>
                      {String(
                        e.detail.work_id ||
                          e.detail.copy_id ||
                          e.detail.rows ||
                          "Reviewed change",
                      )}
                    </small>
                  </div>
                  <time>{new Date(e.timestamp).toLocaleDateString()}</time>
                </div>
              ))}
            </div>
          ) : (
            <div className="quiet-empty">
              <Clock3 size={25} />
              <h3>A clean start.</h3>
              <p>Reviewed catalog and inventory changes will appear here.</p>
            </div>
          )}
        </section>
        <section className="workspace-agent-card">
          <Workflow size={28} strokeWidth={1.3} />
          <span className="eyebrow">THE TEAM BEHIND DISCOVERY</span>
          <h2>
            Specialists.
            <br />
            <em>One thoughtful shortlist.</em>
          </h2>
          <p>
            Coordinator, discovery, learning-path, and critic roles work with
            verified catalog tools.
          </p>
          <div className="agent-service-state">
            <span className="status-dot" />
            {data.agents.configured
              ? "OpenAI configured"
              : "Local workflow available · OpenAI ready to connect"}
          </div>
          <Link className="button secondary" href="/admin/agents">
            Open agent workspace <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
    </div>
  );
}
