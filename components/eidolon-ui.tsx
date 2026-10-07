import type { ReactNode, ButtonHTMLAttributes } from "react";
import { EidolonIcon, type EidolonIconName } from "./eidolon-icon";

export type EidolonTone = "cyan" | "gold" | "violet" | "mint" | "amber" | "green" | "blue";

export function EidolonSignal({ icon, label, tone="cyan" }: { icon:EidolonIconName; label:string; tone?:EidolonTone }) {
  return <span className={`eidolon-signal eidolon-signal--${tone}`}><i><EidolonIcon name={icon} size={14}/></i><b>{label}</b></span>;
}

export function EidolonFrame({ eyebrow, title, meta, children, className="" }: { eyebrow?:string; title?:ReactNode; meta?:ReactNode; children?:ReactNode; className?:string }) {
  return <section className={`eidolon-frame ${className}`}><div className="eidolon-frame-top">{eyebrow && <span>{eyebrow}</span>}{meta && <em>{meta}</em>}</div>{title && <h2>{title}</h2>}{children}</section>;
}

export function EidolonAction({ icon, children, tone="cyan", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?:EidolonIconName; tone?:EidolonTone }) {
  return <button {...props} className={`eidolon-action eidolon-action--${tone} ${props.className ?? ""}`}><span className="eidolon-action-glow" aria-hidden="true"/>{icon && <EidolonIcon name={icon} size={15}/>}<span>{children}</span><i aria-hidden="true">↗</i></button>;
}

export function EidolonStatus({ label, value, tone="cyan" }: { label:string; value:string; tone?:EidolonTone }) {
  return <div className={`eidolon-status eidolon-status--${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

export function EidolonObjectGlyph({ icon, tone="cyan", children }: { icon:EidolonIconName; tone?:EidolonTone; children?:ReactNode }) {
  return <div className={`eidolon-object-glyph eidolon-object-glyph--${tone}`}><span><EidolonIcon name={icon} size={22}/></span>{children && <small>{children}</small>}</div>;
}
