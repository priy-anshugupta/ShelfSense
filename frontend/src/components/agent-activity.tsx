"use client";
import {
  Check,
  LoaderCircle,
  ArrowUpRight,
  Workflow,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import type { AgentEvent } from "@/lib/types";
const roles = [
  [
    "coordinator",
    "Librarian coordinator",
    "Understands and routes your request",
  ],
  ["discovery", "Discovery specialist", "Finds candidates using catalog tools"],
  [
    "learning",
    "Learning-path specialist",
    "Checks prerequisite evidence when needed",
  ],
  ["critic", "Recommendation critic", "Reviews the supported shortlist"],
];
export function AgentActivity({
  events,
  busy,
  configured,
}: {
  events: AgentEvent[];
  busy: boolean;
  configured: boolean;
}) {
  return (
    <section className="agent-activity" aria-label="Agent activity">
      <div className="agent-panel-heading">
        <div>
          <Workflow size={17} />
          <strong>The team behind your shortlist</strong>
        </div>
        <span className={"mode-badge " + (configured ? "live" : "")}>
          {configured ? "OpenAI agents" : "Local workflow"}
        </span>
      </div>
      <p className="agent-intro">
        {configured
          ? "Specialists work with your catalog and pass verified results between roles."
          : "Connect OpenAI to activate the specialists. The local recommendation engine remains available."}
      </p>
      <div className="agent-stages">
        {roles.map(([id, name, description]) => {
          const latest = events
            .filter((e) => e.agent === id && e.event !== "tool")
            .at(-1);
          const tool = events
            .filter((e) => e.agent === id && e.event === "tool")
            .at(-1);
          const active =
            busy && (latest?.state === "running" || tool?.state === "running");
          return (
            <div
              className={
                "agent-stage " +
                (active ? "running" : latest?.state || "pending")
              }
              key={id}
            >
              <span className="agent-state-icon">
                {active ? (
                  <LoaderCircle className="spin" size={15} />
                ) : latest?.state === "complete" ? (
                  <Check size={15} />
                ) : latest?.state === "fallback" ? (
                  <AlertCircle size={15} />
                ) : (
                  <span />
                )}
              </span>
              <div>
                <strong>{name}</strong>
                <p>{latest?.summary || description}</p>
                {tool && (
                  <small>
                    {tool.name?.replaceAll("_", " ")} · {tool.summary}
                  </small>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Link className="text-button" href="/about#agents">
        How the team works <ArrowUpRight size={13} />
      </Link>
    </section>
  );
}
