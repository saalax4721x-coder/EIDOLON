"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { EidolonNav } from "@/components/eidolon-nav";
type Company = { id: string; name: string; status: string };
type Metrics = { companyId: string; counts: Record<string, number>; statuses: Record<string, Record<string, number>>; quotedAmounts: { currency: string; status: string; amount: string; count: number }[]; ownedCompanies: number; asOf: string };
const cards = [["agents", "AI employees"], ["tasks", "Agent tasks"], ["workflows", "Workflows"], ["runs", "Workflow runs"], ["leads", "Customer leads"], ["quotes", "Quotes"], ["jobs", "Jobs"], ["sponsorOffers", "Sponsor listings"], ["sponsorApplications", "Applications sent"], ["sponsorInbox", "Applications received"]] as const;
export default function DashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]), [companyId, setCompanyId] = useState(""), [metrics, setMetrics] = useState<Metrics | null>(null), [error, setError] = useState(""), [initialLoading, setInitialLoading] = useState(true), [loading, setLoading] = useState(false), [reload, setReload] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setInitialLoading(true); setError("");
    fetch("/api/companies", { cache: "no-store", signal: abort.signal }).then(async r => { const d = await r.json(); if (!r.ok) throw Error(d.error ?? "Unable to load companies"); if (!abort.signal.aborted) { setCompanies(d.companies); const requested = new URLSearchParams(location.search).get("companyId"); setCompanyId(current => d.companies.some((c: Company) => c.id === current) ? current : d.companies.some((c: Company) => c.id === requested) ? requested : d.companies[0]?.id ?? ""); } }).catch(e => { if (!abort.signal.aborted) setError(e.message); }).finally(() => { if (!abort.signal.aborted) setInitialLoading(false); });
    return () => abort.abort();
  }, [reload]);
  useEffect(() => {
    if (!companyId) { setMetrics(null); return; }
    const abort = new AbortController(); setMetrics(null); setLoading(true); setError("");
    fetch(`/api/company/dashboard?companyId=${companyId}`, { cache: "no-store", signal: abort.signal }).then(async r => { const d = await r.json(); if (!r.ok) throw Error(d.error ?? "Metrics unavailable"); if (!abort.signal.aborted) setMetrics(d); }).catch(e => { if (!abort.signal.aborted) setError(e.message); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [companyId, reload]);
  return <main className="surface company-foundry"><EidolonNav section="company"/><header className="company-hero"><div className="eyebrow">EIDOLON / LIVE OPERATIONS</div><h1>Company dashboard.</h1><p>Actual company records, grouped by their recorded status.</p></header><div className="foundry-workspace"><div className="foundry-main" style={{ width: "100%" }}>
    <section className="company-section" aria-busy={loading || initialLoading}><div className="company-section-head"><h2>Company overview</h2><button type="button" disabled={initialLoading || loading} onClick={() => setReload(v => v + 1)}>Refresh statistics</button></div>
      {initialLoading ? <p role="status">Loading companies…</p> : companies.length ? <><p>{companies.length} owned companies · Selected company: {companies.find(c => c.id === companyId)?.status}</p><label>Company <select value={companyId} onChange={e => setCompanyId(e.target.value)}>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></> : !error ? <p>No companies yet. <Link href="/company">Create a company</Link> to begin.</p> : null}
      {error && <p role="alert">{error} <Link href="/auth?next=/dashboard">Sign in</Link></p>}{loading && <p role="status">Loading live metrics…</p>}
    </section>
    {metrics && <><section className="company-section"><div className="company-section-head"><h2>Operational statistics</h2><small>Updated {new Date(metrics.asOf).toLocaleString()}</small></div><div className="foundry-metric-grid">{cards.map(([key, label]) => <article key={key} className="company-agent"><small>{label}</small><h2>{typeof metrics.counts[key] === "number" ? metrics.counts[key].toLocaleString() : "Unavailable"}</h2><ul>{Object.entries(metrics.statuses[key] ?? {}).map(([state, count]) => <li key={state}>{state}: {count.toLocaleString()}</li>)}</ul></article>)}</div><p>Counts cover all stored company records, including archived workflows and cancelled work. Statuses are recorded states, not proof of real-world delivery.</p></section>
      <section className="company-section"><h2>Quoted value by currency and status</h2><p>Quoted amounts are not payments or recognized revenue. Different currencies are kept separate.</p>{metrics.quotedAmounts.length ? <div style={{ overflowX: "auto" }}><table><thead><tr><th>Currency</th><th>Status</th><th>Quotes</th><th>Total quoted amount</th></tr></thead><tbody>{metrics.quotedAmounts.map(q => <tr key={`${q.currency}-${q.status}`}><td>{q.currency}</td><td>{q.status}</td><td>{q.count}</td><td>{q.amount}</td></tr>)}</tbody></table></div> : <p>No quotes recorded.</p>}</section></>}
    <section className="company-section"><h2>Workspaces</h2><div className="company-agent-list"><Link href={`/company${companyId ? `?companyId=${companyId}` : ""}`}>Company, agents, tasks, leads, quotes and jobs ↗</Link><Link href={`/workflows${companyId ? `?companyId=${companyId}` : ""}`}>Agent workflow nodes and runs ↗</Link><Link href="/sponsorships">Sponsorship Exchange ↗</Link></div></section>
  </div></div></main>;
}
