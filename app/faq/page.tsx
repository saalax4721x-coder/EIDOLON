import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { faqs } from "@/lib/help-content";
export const metadata: Metadata = { title: "FAQ · EIDOLON" };
export default function FAQ() {
  return <ContentPage eyebrow="Questions" title="Good to know." intro="Straight answers about your account, projects, company and agents."><div className="faq-list">{faqs.map(({question,answer})=><details className="faq-item glass" key={question}><summary>{question}<span className="faq-plus" aria-hidden="true"/></summary><p>{answer}</p></details>)}</div></ContentPage>;
}
