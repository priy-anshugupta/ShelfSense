"use client";
import Link from "next/link";
import { Workflow, ArrowUpRight, Check, ArrowRight } from "lucide-react";
import { useData } from "@/lib/use-data";
import { Loading, Empty } from "@/components/ui";
type Data = {
  configured: boolean;
  model: string;
  roles: { id: string; name: string; role: string }[];
  runs: number;
  fallbacks: number;
  openai_runs: number;
  tools: string[];
  notice: string;
};
export default function Agents() {
  const { data, error, loading } = useData<Data>("admin/agents");
  if (loading) return <Loading />;
  if (error || !data)
    return <Empty title="Library access required" text={error} />;
  return (
    <div className="page">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">PURPOSEFUL INTELLIGENCE</span>
          <h1>
            The agent <em>workspace.</em>
          </h1>
          <p>Specialized roles, bounded tools, and catalog evidence.</p>
        </div>
        <Link className="button primary" href="/librarian">
          Try the librarian <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="agent-config-banner">
        <Workflow size={26} />
        <div>
          <strong>
            {data.configured
              ? "OpenAI agents are configured"
              : "The local workflow is ready"}
          </strong>
          <p>
            {data.configured
              ? `Model: ${data.model}. The team runs on relevant librarian requests.`
              : "Set OPENAI_API_KEY in backend/.env to activate model-based handoffs. No API key is needed for local search or accounts."}
          </p>
        </div>
        <span className={"mode-badge " + (data.configured ? "live" : "")}>
          {data.configured ? "Configured" : "Key not configured"}
        </span>
      </div>
      <div className="workspace-stat-grid three">
        {[
          ["Latest completed runs", data.runs],
          ["OpenAI runs", data.openai_runs],
          ["Local / fallback runs", data.fallbacks],
        ].map(([t, n]) => (
          <div key={t}>
            <span>{t}</span>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      <div className="role-card-grid">
        {data.roles.map((r, i) => (
          <section className="role-card" key={r.id}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <h2>{r.name}</h2>
            <p>{r.role}</p>
            <small>
              {r.id === "learning"
                ? "Used for learning-path requests"
                : r.id === "discovery"
                  ? "Tool calling; IDs constrained to the catalog"
                  : "Validated structured output"}
            </small>
          </section>
        ))}
      </div>
      <section className="workspace-panel tool-panel">
        <h2>A small, useful toolbox.</h2>
        <p>
          Tools run inside the backend with the current reader’s permissions and
          active restrictions.
        </p>
        <div className="tool-pills">
          {data.tools.map((t) => (
            <span key={t}>
              <Check size={14} />
              {t}
            </span>
          ))}
        </div>
        <p className="fineprint">
          The model cannot execute SQL, change inventory, select another
          reader’s identity, or fabricate a book. Availability and edition
          constraints remain deterministic.
        </p>
      </section>
      <p className="fineprint" style={{ marginTop: 20 }}>
        {data.notice}
      </p>
    </div>
  );
}
