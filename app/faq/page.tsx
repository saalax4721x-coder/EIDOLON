"use client";
import { useState } from "react";

const faqs = [
  ["What is EIDOLON?","A discovery and economic network for real projects, products, software, assets and services. EIDOLON records what exists and connects people to it without pretending unsupported capabilities are live."],
  ["Does a project need a token?","No. A project can launch with no token or with its own economy. A token is optional and never required for discovery."],
  ["What does Verified mean?","Verified means EIDOLON has obtained a real proof from the underlying source or connected account. A submitted URL or identifier is not treated as proof by itself."],
  ["Can I sell anything through EIDOLON?","Only where the underlying asset, service or market actually supports it and the required account, source or network capability exists."],
  ["How does sign-in work?","EIDOLON uses a passwordless secure-link flow with PKCE. Your session is stored in protected cookies."],
  ["Can I connect GitHub?","Yes. GitHub projects can use the real GitHub OAuth connection to prove repository control. EIDOLON does not manufacture repository ownership."],
  ["Why do some actions say Network layer?","That action is part of the canonical EIDOLON model, but its required external capability is not active for that project yet. We prefer an honest state over a decorative button."],
  ["Are discovery metrics real?","Yes. EIDOLON does not invent activity, followers or usage. If verified metrics are unavailable, the interface says so."],
];
export default function FAQ(){
 const [open,setOpen]=useState<number|null>(0);
 return <main className="info-page"><header className="surface-nav"><a href="/" className="wordmark">EIDOLON</a><nav className="surface-nav-links"><a href="/discover">Discover</a><a href="/launch">Launch</a><a href="/help">Help</a></nav></header><section className="info-hero"><span className="eyebrow">KNOWLEDGE / FAQ</span><h1>Questions before<br/><em>you enter.</em></h1><p>The short version of how the network works — without crypto theatre, fake metrics or hidden assumptions.</p></section><section className="faq-list">{faqs.map(([q,a],i)=><article className={open===i?"faq-item open":"faq-item"} key={q}><button onClick={()=>setOpen(open===i?null:i)}><span>{String(i+1).padStart(2,"0")}</span><strong>{q}</strong><i>{open===i?"−":"+"}</i></button>{open===i&&<p>{a}</p>}</article>)}</section></main>;
}
