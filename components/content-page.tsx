import type { ReactNode } from "react";
import Link from "next/link";
import { EidolonNav } from "@/components/eidolon-nav";
import { site } from "@/lib/site";
export function ContentPage({ eyebrow, title, intro, children, legal = false }: { eyebrow: string; title: string; intro: string; children: ReactNode; legal?: boolean }) {
  return <main id="main-content" className="content-page"><EidolonNav/><header className="content-head"><span className="pk">{eyebrow}</span><h1>{title}</h1><p>{intro}</p>{legal && <><p className="policy-date">Draft for launch · Updated {site.policyUpdated}</p><aside className="policy-notice">Operator identity, contact details and jurisdiction are pending. These pages describe the current product and need those details and a jurisdiction-specific review before public launch. <Link href="/legal#contact">View setup status</Link>.</aside></>}</header><div className="content-body">{children}</div></main>;
}
export function ContactDetails() {
  return <section id="contact"><h2>Contact &amp; operator</h2><p>{site.operator || "EIDOLON’s operator name has not yet been published."} {site.country ? `Operating country: ${site.country}.` : "Operating country and legal jurisdiction are pending."}</p>{site.supportEmail ? <p><a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a></p> : <p>A verified support, privacy and legal contact will be added before public launch. No contact form is active yet. Please do not send credentials, private keys or sensitive customer information through public channels.</p>}</section>;
}
