"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { selectWorkspaceCompany } from "@/lib/workspace-navigation";
export type WorkspaceCompany={id:string;name:string;mission:string;industry:string;status:string};
type Scope={status:"loading"|"ready"|"signed-out"|"error";companies:WorkspaceCompany[];companyId:string;email:string;error:string;chooseCompany:(id:string)=>void;refresh:()=>void};
const Context=createContext<Scope|null>(null);
const companyKey="eidolon.workspace.company.v1";
function remember(id:string){try{localStorage.setItem(companyKey,id);}catch{/* Selection still works when storage is unavailable. */}const url=new URL(window.location.href);if(id)url.searchParams.set("companyId",id);else url.searchParams.delete("companyId");window.history.replaceState(null,"",url.pathname+url.search+url.hash);}
export function WorkspaceProvider({children}:{children:ReactNode}){
  const [status,setStatus]=useState<Scope["status"]>("loading"),[companies,setCompanies]=useState<WorkspaceCompany[]>([]),[companyId,setCompanyId]=useState(""),[email,setEmail]=useState(""),[error,setError]=useState(""),[revision,setRevision]=useState(0);
  const currentStatus=useRef(status);currentStatus.current=status;
  const refresh=useCallback(()=>setRevision(value=>value+1),[]);
  useEffect(()=>{window.addEventListener("eidolon:companies-changed",refresh);return()=>window.removeEventListener("eidolon:companies-changed",refresh);},[refresh]);
  useEffect(()=>{const controller=new AbortController();setStatus("loading");setError("");
    const sessionChanged=(event:Event)=>{const authenticated=(event as CustomEvent<{authenticated:boolean}>).detail?.authenticated;if(authenticated===true&&currentStatus.current==="signed-out"){refresh();return;}if(authenticated===false){controller.abort();setCompanies([]);setCompanyId("");setEmail("");setError("");setStatus("signed-out");}};
    window.addEventListener("eidolon:session",sessionChanged);
    async function load(){try{const response=await fetch("/api/auth/session",{cache:"no-store",signal:controller.signal});const session=await response.json();if(response.status===401||(response.ok&&!session.authenticated)){setCompanies([]);setCompanyId("");setStatus("signed-out");return;}if(!response.ok)throw Error("Your session could not be checked. Please try again.");
      const records=await fetch("/api/companies",{cache:"no-store",signal:controller.signal});if(records.status===401){setCompanies([]);setCompanyId("");setStatus("signed-out");return;}const data=await records.json();if(!records.ok||!Array.isArray(data.companies))throw Error("Your companies could not be loaded. Please try again.");if(controller.signal.aborted)return;
      let remembered="";try{remembered=localStorage.getItem(companyKey)||"";}catch{}
      const requested=new URLSearchParams(window.location.search).get("companyId");const selected=selectWorkspaceCompany(data.companies,requested,remembered);
      setCompanies(data.companies);setCompanyId(selected);setEmail(session.user?.email||"");remember(selected);setStatus("ready");
    }catch(error){if(!controller.signal.aborted){setError(error instanceof Error?error.message:"Workspace unavailable.");setStatus("error");}}}
    void load();return()=>{controller.abort();window.removeEventListener("eidolon:session",sessionChanged);};
  },[revision]);
  function chooseCompany(id:string){if(id===companyId||!companies.some(company=>company.id===id))return;const event=new CustomEvent("eidolon:before-company-switch",{cancelable:true,detail:{companyId:id}});if(!window.dispatchEvent(event))return;remember(id);setCompanyId(id);}
  return <Context.Provider value={{status,companies,companyId,email,error,chooseCompany,refresh}}>{children}</Context.Provider>;
}
export function useWorkspace(){const value=useContext(Context);if(!value)throw Error("Workspace provider is required.");return value;}
