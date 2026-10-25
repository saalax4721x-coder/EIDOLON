import Link from "next/link";
import { EidolonNav } from "@/components/eidolon-nav";
import { PorcelainHero } from "@/components/porcelain-hero";
import { faqs } from "@/lib/help-content";
export default function Home() {
  return <main id="main-content" className="porc"><div className="home-nav"><EidolonNav/></div><PorcelainHero/>
    <section className="psec wrap" id="what"><div className="phead"><span className="pk">What it is</span><h2>Good things deserve a <span className="hl">home.</span></h2><p className="home-statement">Bring a project into the world. Give your company a workspace. Connect the people and agents who help you move it forward.</p></div><ul className="kinds">{["Software", "Apps", "APIs", "Games", "Services", "Datasets", "Companies"].map(kind=><li key={kind} className="glass">{kind}</li>)}</ul></section>
    <section className="psec wrap" id="how"><div className="phead phead--row"><div><span className="pk">How it works</span><h2>From an idea to <span className="hl">useful work.</span></h2></div><p>A clear path, with you in control of each meaningful action.</p></div><div className="home-steps">{[
      ["01", "Make it yours.", "Sign in with a secure email link. Create a project or a company workspace.", "/auth", "Get started"],
      ["02", "Connect what you need.", "Add a source for your project or connect an AI provider for your company’s agents.", "/connectors", "Explore connections"],
      ["03", "Build, then review.", "Assign tasks, connect workflow steps and review saved outputs before continuing.", "/workflows", "Open workflows"],
    ].map(([n,title,body,href,action])=><article className="glass" key={n}><span className="pk">{n}</span><h3>{title}</h3><p>{body}</p><Link href={href}>{action} ↗</Link></article>)}</div></section>
    <section className="psec wrap" id="proof"><div className="home-split glass"><div><span className="pk">A claim is not proof</span><h2>Keep the real thing <span className="hl">visible.</span></h2></div><div><p>Project pages distinguish verified sources from claims awaiting proof. Company dashboards count recorded work, leads, quotes and jobs.</p><p>No invented sponsors or activity. A quote is a quote; it is not recorded revenue. Supported workflow actions create real tasks and saved results.</p><Link className="btn btn--quiet" href="/how-it-works">See how it works ↗</Link></div></div></section>
    <section className="psec wrap" id="company"><div className="phead"><span className="pk">Your workspace</span><h2>Give your team <span className="hl">room to work.</span></h2></div><div className="home-steps">{[
      ["Company Foundry", "Manage agents, provider connections, tasks, customer leads, quotes and jobs.", "/company"],
      ["Agent workflows", "Create and connect steps. Run supported actions and pause for owner review.", "/workflows"],
      ["Sponsorship exchange", "Publish a real offer or submit a pitch. Applications stay separate from commitments.", "/sponsorships"],
    ].map(([title,body,href])=><Link className="home-feature glass" key={href} href={href}><h3>{title} ↗</h3><p>{body}</p></Link>)}</div></section>
    <section className="psec wrap" id="faq"><div className="faq"><div className="phead"><span className="pk">Questions</span><h2>Good to know.</h2><Link href="/faq">All questions ↗</Link></div><div className="faq-list">{faqs.slice(0,5).map(({question,answer})=><details className="faq-item glass" key={question}><summary>{question}<span className="faq-plus" aria-hidden="true"/></summary><p>{answer}</p></details>)}</div></div></section>
    <section className="pclose wrap"><div className="pclose-card glass"><span className="pk">Start with what matters</span><h2>Make space for your <span className="hl">next thing.</span></h2><p>One project. One company. Your next useful step.</p><div className="phero-ctas"><Link className="btn" href="/launch">Launch a project ↗</Link><Link className="btn btn--quiet" href="/company">Create a company</Link></div></div></section>
  </main>;
}
