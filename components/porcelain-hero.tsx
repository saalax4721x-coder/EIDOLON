"use client";
import { useState } from "react";
import Link from "next/link";
import { PorcelainChrome } from "./porcelain-chrome";
const stages = [
  { name: "Launch", title: "A place for what you build.", text: "Create a project page with its name, source and capabilities. Start without a token.", href: "/launch", action: "Launch a project" },
  { name: "Prove", title: "Let the source speak.", text: "Connect GitHub to verify repository control. Other source claims remain unverified until checked.", href: "/connectors", action: "Connect a source" },
  { name: "Discover", title: "Find your next useful thing.", text: "Explore real project records, follow what interests you and inspect recorded relationships.", href: "/discover", action: "Discover projects" },
  { name: "Build", title: "Turn intention into work.", text: "Create a company, connect a provider and give your agents a workflow you can review.", href: "/company", action: "Create a company" },
];
export function PorcelainHero() {
  const [selected, setSelected] = useState(0);
  const stage = stages[selected];
  return <section className="phero" aria-labelledby="hero-title"><h1 className="phero-title" id="hero-title"><span className="pt-line">Launch anything.</span><span className="pt-line pt-line--b">Prove it's <span className="hl">real.</span></span></h1>
    <div className="phero-stage"><PorcelainChrome stage={selected}/><span className="chrome-hint">Drag to rotate · choose a stage to transform</span></div><div className="phero-bottom"><div className="phero-intro"><p>A home for things people build. A workspace for the people and agents who bring them to life.</p><div className="phero-ctas"><Link href={stage.href} className="btn">{stage.action} <span aria-hidden="true">↗</span></Link><Link href="/how-it-works" className="btn btn--quiet">How it works</Link></div></div><div className="phero-panel"><div className="stage-tabs glass" role="group" aria-label="Explore EIDOLON">{stages.map((item,i)=><button type="button" key={item.name} aria-pressed={selected===i} onClick={()=>setSelected(i)}><b>0{i+1}</b>{item.name}</button>)}</div><div className="stage-card glass" aria-live="polite"><strong>{stage.title}</strong><p>{stage.text}</p></div></div></div>
  </section>;
}
