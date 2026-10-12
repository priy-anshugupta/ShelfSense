"use client";
import { useData } from "@/lib/use-data";
import { Loading, Empty } from "@/components/ui";
type Report = {
  status: string;
  timestamp: string;
  catalog_size: number;
  requests: number;
  engine: string;
  notice: string;
  hybrid: {
    precision_at_5: number;
    ndcg_at_5: number;
    coverage: number;
    mean_latency_ms: number;
  };
  tfidf: { precision_at_5: number; ndcg_at_5: number };
  rows: {
    query: string;
    hybrid_ids: string[];
    precision_at_5: number;
    ndcg_at_5: number;
  }[];
};
export default function EvaluationPage() {
  const { data, error, loading } = useData<Report>("evaluation/summary");
  return (
    <div className="wrap page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">A PROJECT YOU CAN INSPECT</span>
          <h1>
            Evidence over <em>guesswork.</em>
          </h1>
          <p>A measured, reproducible look at the recommendation engine.</p>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <Empty title="The report couldn’t open" text={error} />
      ) : data?.status !== "measured" ? (
        <Empty
          title="Evaluation has not run yet"
          text="A measured report will appear after the project evaluation script runs. No results are fabricated."
        />
      ) : (
        <>
          <div className="callout">
            <strong>Scope of this experiment</strong>
            {data.notice}
          </div>
          <div className="evaluation-grid">
            <div className="evaluation-card">
              <strong>{data.hybrid.precision_at_5.toFixed(3)}</strong>
              <p>Hybrid Precision@5 · {data.requests} labeled requests</p>
            </div>
            <div className="evaluation-card">
              <strong>{data.hybrid.ndcg_at_5.toFixed(3)}</strong>
              <p>Hybrid NDCG@5 · top-five ranking</p>
            </div>
            <div className="evaluation-card">
              <strong>{Math.round(data.hybrid.coverage * 100)}%</strong>
              <p>Catalog coverage · {data.catalog_size} demonstration titles</p>
            </div>
          </div>
          <div className="section-heading compact">
            <h2>Baseline comparison</h2>
            <span className="fineprint">
              {data.engine} · measured{" "}
              {new Date(data.timestamp).toLocaleDateString()}
            </span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Precision@5</th>
                  <th>NDCG@5</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>TF-IDF content retrieval</td>
                  <td>{data.tfidf.precision_at_5}</td>
                  <td>{data.tfidf.ndcg_at_5}</td>
                </tr>
                <tr>
                  <td>Hybrid recommendation pipeline</td>
                  <td>{data.hybrid.precision_at_5}</td>
                  <td>{data.hybrid.ndcg_at_5}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="section-heading compact" style={{ marginTop: 35 }}>
            <h2>Every request, visible.</h2>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Returned catalog IDs</th>
                  <th>Precision@5</th>
                  <th>NDCG@5</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.query}>
                    <td>{r.query}</td>
                    <td>
                      <small>{r.hybrid_ids.join(", ")}</small>
                    </td>
                    <td>{r.precision_at_5}</td>
                    <td>{r.ndcg_at_5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="prose">
            <h2>What this does—and doesn’t—establish</h2>
            <p>
              The numbers describe this explicit gold set, on this small
              catalog, with the current engine. They do not establish that the
              hybrid approach outperforms other products or that a reader will
              enjoy a recommendation. A larger catalog, independent relevance
              judgments, and a user study remain future evaluation work.
            </p>
            <p>
              Constraint, authorization, stale-inventory, versioning, and import
              behavior are checked separately in the backend test suite. Model
              providers are optional; live provider quality is only testable
              after credentials are configured.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
