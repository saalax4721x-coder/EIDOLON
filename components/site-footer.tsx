import Link from "next/link";
import { site } from "@/lib/site";
export function SiteFooter() {
  return <footer className="site-footer" aria-label="Site footer"><div className="site-footer-grid">
    <div className="footer-brand"><Link href="/">eidolon<span aria-hidden="true">↗</span></Link><p>A home for what you build.<br/>A workspace for what comes next.</p></div>
    <nav aria-label="Product"><h2>Explore</h2><Link href="/workspace">My workspace</Link><Link href="/marketplace">Marketplace</Link><Link href="/discover">Discover projects</Link><Link href="/company">Company Foundry</Link><Link href="/dashboard">Dashboard</Link><Link href="/workflows">Workflows</Link><Link href="/sponsorships">Sponsorships</Link></nav>
    <nav aria-label="Resources"><h2>Get started</h2><Link href="/how-it-works">How it works</Link><Link href="/help">How to use EIDOLON</Link><Link href="/faq">FAQ</Link><Link href="/notifications">Notifications</Link><Link href="/connectors">Connections</Link></nav>
    <nav aria-label="Legal and social"><h2>The details</h2><Link href="/legal">Legal centre</Link><Link href="/terms">Terms of service</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link><Link href="/acceptable-use">Acceptable use</Link>{site.socialX ? <a href={site.socialX} target="_blank" rel="noopener noreferrer">EIDOLON on X ↗</a> : <span className="footer-pending">X · link coming soon</span>}</nav>
  </div><div className="footer-bottom"><span>© {new Date().getFullYear()} EIDOLON</span><span>Built with intention. Operated with care.</span><Link href="/legal#contact">Contact &amp; legal details</Link></div></footer>;
}
