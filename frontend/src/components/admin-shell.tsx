"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  BookOpen,
  Upload,
  BarChart3,
  Workflow,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { useApp } from "./provider";
const links = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/catalog", "Catalog", BookOpen],
  ["/admin/inventory", "Inventory", Library],
  ["/admin/imports", "Import copies", Upload],
  ["/admin/insights", "Reader insights", BarChart3],
  ["/admin/agents", "Agent workspace", Workflow],
] as const;
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { config } = useApp();
  return (
    <div className="staff-workspace">
      <aside className="staff-sidebar">
        <div className="staff-brand">
          <span className="eyebrow">SHELF SENSE</span>
          <h2>Library workspace</h2>
          <span className="staff-org">
            <span className="status-dot" />
            {config?.demo ? "Demonstration library" : "Library administration"}
          </span>
        </div>
        <nav aria-label="Library workspace navigation">
          {links.map(([url, label, Icon]) => (
            <Link href={url} className={path === url ? "active" : ""} key={url}>
              <Icon size={17} strokeWidth={1.5} />
              {label}
              {path === url && <ChevronRight size={14} />}
            </Link>
          ))}
        </nav>
        <div className="staff-sidebar-bottom">
          <p>A thoughtful collection starts with well-kept details.</p>
          <Link href="/discover">
            Back to the books <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <section className="staff-content">{children}</section>
    </div>
  );
}
