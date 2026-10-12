"use client";
import Link from "next/link";
import { useData } from "@/lib/use-data";
import { Loading, Empty } from "@/components/ui";
export default function Insights() {
  const { data, error, loading } = useData<{
    saved_by_title: { title: string; count: number }[];
    total_saves: number;
    feedback_count: number;
    conversations: number;
    annotation_notice: string;
  }>("admin/insights");
  return (
    <div className="wrap page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            UNDERSTAND YOUR READERS, RESPECT THEIR PRIVACY
          </span>
          <h1>
            A sense of the <em>library.</em>
          </h1>
          <p>
            Aggregate interest in the collection. Private notes and conversation
            text stay private.
          </p>
        </div>
      </div>
      <nav className="staff-nav">
        <Link href="/admin">Inventory</Link>
        <Link href="/admin/catalog">Catalog</Link>
        <Link href="/admin/insights" className="active">
          Library insights
        </Link>
      </nav>
      {loading ? (
        <Loading />
      ) : error ? (
        <Empty title="Staff access required" text={error} />
      ) : (
        <>
          <div className="admin-stats">
            {[
              ["Shelf entries", data?.total_saves],
              ["Feedback events", data?.feedback_count],
              ["Conversations", data?.conversations],
            ].map(([t, n]) => (
              <div key={t}>
                <strong>{n}</strong>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <h2 style={{ marginBottom: 20 }}>What readers are saving</h2>
          {data?.saved_by_title.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Shelf entries</th>
                  </tr>
                </thead>
                <tbody>
                  {data.saved_by_title.map((t) => (
                    <tr key={t.title}>
                      <td>{t.title}</td>
                      <td>{t.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="A little more reading first"
              text="Aggregate demand appears as readers save books. No sample popularity numbers are invented."
            />
          )}
          <p className="fineprint" style={{ marginTop: 20 }}>
            {data?.annotation_notice}
          </p>
        </>
      )}
    </div>
  );
}
