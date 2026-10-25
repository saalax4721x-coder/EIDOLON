"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/workspace-provider";
import {EidolonNav} from "@/components/eidolon-nav";
type Company={id:string;name:string};
type Offer={id:string;sponsor_company_id:string;sponsor_name:string;contact_email:string;title:string;description:string;categories:string;eligibility:string;budget_note:string;status:string;created_at:string};
type Application={id:string;applicant_name:string;offer_id:string;sponsor_company_id:string;applicant_company_id:string;pitch:string;requested_support:string;status:string;created_at:string};
export default function SponsorshipsPage(){
 const scope=useWorkspace();
 const [companies,setCompanies]=useState<Company[]>([]),[companyId,setCompanyId]=useState("");
 const [offers,setOffers]=useState<Offer[]>([]),[applications,setApplications]=useState<Application[]>([]),[inbox,setInbox]=useState<Application[]>([]);
 const [title,setTitle]=useState(""),[description,setDescription]=useState(""),[categories,setCategories]=useState(""),[eligibility,setEligibility]=useState(""),[budgetNote,setBudgetNote]=useState(""),[contactEmail,setContactEmail]=useState("");
 const [selectedOffer,setSelectedOffer]=useState(""),[pitch,setPitch]=useState(""),[requestedSupport,setRequestedSupport]=useState("");
 const [busy,setBusy]=useState(false),[loadingCompanies,setLoadingCompanies]=useState(true),[loadingMarket,setLoadingMarket]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async(id:string)=>{
  const r=await fetch("/api/company/sponsorships?companyId="+encodeURIComponent(id),{cache:"no-store"});
  const d=await r.json();if(!r.ok)throw Error(d.error??"Marketplace unavailable");
  setOffers(d.offers??[]);setApplications(d.applications??[]);setInbox(d.inbox??[]);
 },[]);
 useEffect(()=>{fetch("/api/companies",{cache:"no-store"}).then(async r=>{if(r.status===401){window.location.href="/auth?next=/sponsorships";return;}const d=await r.json();if(!r.ok)throw Error(d.error??"Companies unavailable");setCompanies(d.companies??[]);setCompanyId(d.companies?.some((company:Company)=>company.id===scope.companyId)?scope.companyId:d.companies?.[0]?.id??"");}).catch(e=>setError(String(e))).finally(()=>setLoadingCompanies(false));},[]);
 useEffect(()=>{if(!companyId){setLoadingMarket(false);setOffers([]);setApplications([]);setInbox([]);return;}let active=true;setLoadingMarket(true);setOffers([]);setApplications([]);setInbox([]);fetch("/api/company/sponsorships?companyId="+encodeURIComponent(companyId),{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error??"Marketplace unavailable");if(active){setOffers(d.offers??[]);setApplications(d.applications??[]);setInbox(d.inbox??[]);}}).catch(e=>{if(active)setError(String(e));}).finally(()=>{if(active)setLoadingMarket(false);});return()=>{active=false;};},[companyId]);
 async function submit(kind:"offer"|"application"){
  if(!companyId)return;setBusy(true);setError("");setNotice("");
  try{
   const payload=kind==="offer"?{companyId,kind,title,description,categories,eligibility,budgetNote,contactEmail}:{companyId,kind,offerId:selectedOffer,pitch,requestedSupport};
   const r=await fetch("/api/company/sponsorships",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const d=await r.json();if(!r.ok)throw Error(d.error??"Could not submit");
   if(kind==="offer"){setTitle("");setDescription("");setCategories("");setEligibility("");setBudgetNote("");setContactEmail("");}else{setPitch("");setRequestedSupport("");setSelectedOffer("");}
   await load(companyId);setNotice(kind==="offer"?"Your offer is now visible to signed-in company owners.":"Application saved. The sponsor can review it in EIDOLON; no email was sent.");
  }catch(e){setError(e instanceof Error?e.message:"Request failed");}finally{setBusy(false);}
 }
 async function update(kind:"offer"|"application"|"withdrawal",recordId:string,status:string){
  if(!companyId)return;setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch("/api/company/sponsorships",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyId,kind,recordId,status})});
   const d=await r.json();if(!r.ok)throw Error(d.error??"Update failed");
   await load(companyId);setNotice("Status updated in EIDOLON. No external notification was sent.");
  }catch(e){setError(e instanceof Error?e.message:"Update failed");}finally{setBusy(false);}
 }
 const ownOffers=offers.filter(o=>o.sponsor_company_id===companyId),discover=offers.filter(o=>o.sponsor_company_id!==companyId&&o.status==="published");
 return <main className="surface company-foundry"><EidolonNav section="company"/>
  <header className="company-hero"><div className="eyebrow">EIDOLON / SPONSORSHIP EXCHANGE</div><h1>Find partners.<br/><em>Fund real progress.</em></h1><p>Companies can publicly opt in to sponsorship opportunities. Founders can discover relevant offers, pitch their products, and track sponsor decisions in one place.</p><p className="company-muted">Listings are owner-submitted, not endorsements or verified commitments. No funding, payment, contact or external message is automated.</p></header>
  <div className="foundry-workspace"><div className="foundry-main" style={{width:"100%"}}>
   <section className="company-section"><div className="company-section-head"><div><div className="eyebrow">YOUR IDENTITY</div><h2>Choose your company</h2></div><Link href="/company">Company Foundry ↗</Link></div>
    {loadingCompanies?<p role="status">Loading your companies…</p>:companies.length?<label>Acting as <select value={companyId} onChange={e=>{scope.chooseCompany(e.target.value);setSelectedOffer("");setError("");setNotice("");}}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>:<p>Create a company in Company Foundry to publish or apply for sponsorships.</p>}
    {error&&<p role="alert" className="company-alert error">{error}</p>}{notice&&<p role="status" className="company-alert success">{notice}</p>}
   </section>
   {companyId&&<>{loadingMarket&&<p role="status" aria-live="polite">Loading sponsorship opportunities and applications…</p>}
   <section className="company-section"><div className="company-section-head"><div><div className="eyebrow">01 / DISCOVER</div><h2>Sponsors open to pitches</h2></div><span>{discover.length} available listings</span></div>
    {!loadingMarket&&discover.length===0?<p className="company-muted">No other companies have published a sponsorship opportunity yet. EIDOLON does not invent sponsor interest.</p>:<div className="company-agent-list">{discover.map(o=><article className="company-agent" key={o.id}><div className="company-agent-main"><strong>{o.title}</strong><small>Offered by {o.sponsor_name||"Sponsor company"}</small><p>{o.description}</p><small>Categories: {o.categories||"Open"} · Support: {o.budget_note||"Discuss with sponsor"}</small><p>Eligibility: {o.eligibility||"Ask sponsor"}</p>{o.contact_email&&<p>Public sponsor contact: <a href={"mailto:"+o.contact_email}>{o.contact_email}</a></p>}<button className="quiet-button" onClick={()=>{setSelectedOffer(o.id);document.getElementById("sponsorship-apply")?.scrollIntoView({behavior:"smooth"});}}>Pitch this sponsor ↗</button></div></article>)}</div>}
   </section>
   <section className="company-section" id="sponsorship-apply"><div className="company-section-head"><div><div className="eyebrow">02 / APPLY</div><h2>Offer your product or project</h2></div></div>
    <form className="company-form" onSubmit={e=>{e.preventDefault();void submit("application");}}>
     <label>Sponsorship offer<select required value={selectedOffer} onChange={e=>setSelectedOffer(e.target.value)}><option value="">Choose a published opportunity</option>{discover.map(o=><option value={o.id} key={o.id}>{o.title}</option>)}</select></label>
     <label>What support are you requesting?<input required minLength={5} maxLength={500} value={requestedSupport} onChange={e=>setRequestedSupport(e.target.value)} placeholder="Product credits, equipment, distribution, funding, mentorship…"/></label>
     <label>Your pitch<textarea required minLength={30} maxLength={4000} rows={5} value={pitch} onChange={e=>setPitch(e.target.value)} placeholder="What have you built? Who uses it? What will the sponsor gain? What milestones will you deliver?"/></label>
     <button className="primary" disabled={busy||!selectedOffer}>Submit sponsorship request ↗</button>
    </form>
    <div className="company-archive"><div className="eyebrow">YOUR APPLICATIONS / {applications.length}</div>{applications.map(a=><article key={a.id} className="company-artifact"><b>{offers.find(o=>o.id===a.offer_id)?.title??"Sponsorship opportunity"}</b><p>{a.requested_support}</p><small>{a.status} · {new Date(a.created_at).toLocaleDateString()}</small>{["submitted","reviewing"].includes(a.status)&&<button type="button" className="quiet-button" disabled={busy} onClick={()=>{if(window.confirm("Withdraw this sponsorship application?"))void update("withdrawal",a.id,"withdrawn");}}>Withdraw application</button>}</article>)}</div>
   </section>
   <section className="company-section"><div className="company-section-head"><div><div className="eyebrow">03 / SPONSOR</div><h2>Invite founders to pitch you</h2></div></div>
    <form className="company-form" onSubmit={e=>{e.preventDefault();void submit("offer");}}>
     <label>Opportunity title<input required minLength={5} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Seeking promising local technology startups"/></label>
     <label>What are you offering?<textarea required minLength={20} maxLength={4000} rows={4} value={description} onChange={e=>setDescription(e.target.value)}/></label>
     <label>Relevant sectors<input maxLength={300} value={categories} onChange={e=>setCategories(e.target.value)} placeholder="AI, commerce, education, sustainability"/></label>
     <label>Eligibility<input maxLength={1000} value={eligibility} onChange={e=>setEligibility(e.target.value)} placeholder="Early-stage teams with a working demo"/></label>
     <label>Support or budget (optional, not a guarantee)<input maxLength={240} value={budgetNote} onChange={e=>setBudgetNote(e.target.value)} placeholder="Up to $1,000 in software credits"/></label>
     <label>Public business email (optional)<input type="email" maxLength={254} value={contactEmail} onChange={e=>setContactEmail(e.target.value)} placeholder="partnerships@yourcompany.com"/></label><p className="company-muted">Only enter an address you are authorized to publish. This email will be visible to signed-in founders; leave blank to receive pitches inside EIDOLON only.</p><button className="primary" disabled={busy}>Publish sponsorship offer ↗</button>
    </form>
    <div className="company-archive"><div className="eyebrow">YOUR SPONSOR LISTINGS / {ownOffers.length}</div>{ownOffers.map(o=><article className="company-artifact" key={o.id}><b>{o.title}</b><small>{o.status}</small><label>Listing status<select disabled={busy} value={o.status} onChange={e=>void update("offer",o.id,e.target.value)}>{["published","paused","closed"].map(v=><option key={v} value={v}>{v}</option>)}</select></label></article>)}</div>
   </section>
   <section className="company-section"><div className="company-section-head"><div><div className="eyebrow">04 / INBOX</div><h2>Review founder pitches</h2></div><span>{inbox.length} applications</span></div>
    {inbox.length===0?<p className="company-muted">No sponsorship applications received yet.</p>:inbox.map(a=><article className="company-artifact" key={a.id}><b>{ownOffers.find(o=>o.id===a.offer_id)?.title??"Your offer"}</b><p>{a.pitch}</p><p><strong>Requested:</strong> {a.requested_support}</p><small>From {a.applicant_name||"Applicant company"} · {new Date(a.created_at).toLocaleDateString()}</small>{a.status==="withdrawn"?<p className="company-muted">Withdrawn by applicant · no further review actions available.</p>:<label>Review status<select disabled={busy} value={a.status} onChange={e=>void update("application",a.id,e.target.value)}>{["submitted","reviewing","accepted","declined"].map(v=><option key={v} value={v}>{v}</option>)}</select></label>}</article>)}
   </section>
   </>}
  </div></div>
 </main>;
}
