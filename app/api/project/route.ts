import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";
import type { Project, ProjectAction } from "@/lib/eidolon";

export const dynamic = "force-dynamic";
type Row={id:string;name:string;slug:string;type:Project["type"];description:string|null;economy:Project["economy"];verification_status:Project["source"]["status"];created_at:string};
type Source={kind:Project["source"]["kind"];reference:string;status:Project["source"]["status"];verified_at:string|null};
type ActionRow={action:ProjectAction;enabled:boolean};

async function getAuthHeaders() {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  return token ? { ...supabaseHeaders, Authorization: `Bearer ${token}` } : null;
}

export async function GET(request:NextRequest){
 const slug=request.nextUrl.searchParams.get("slug")?.trim(); if(!slug)return NextResponse.json({error:"Missing project slug."},{status:400});
 const q=encodeURIComponent(slug);
 const p=await fetch(`${supabaseUrl}/rest/v1/projects?select=id,name,slug,type,description,economy,verification_status,created_at&slug=eq.${q}&limit=1`,{headers:supabaseHeaders,cache:"no-store"});
 if(!p.ok)return NextResponse.json({error:"Project could not be loaded."},{status:502});
 const rows=await p.json() as Row[]; const x=rows[0]; if(!x)return NextResponse.json({error:"Project not found."},{status:404});
 const authHeaders=await getAuthHeaders();
 const [s,a,e,f]=await Promise.all([
  fetch(`${supabaseUrl}/rest/v1/project_sources?select=kind,reference,status,verified_at&project_id=eq.${x.id}&order=verified_at.desc`,{headers:supabaseHeaders,cache:"no-store"}),
  fetch(`${supabaseUrl}/rest/v1/project_actions?select=action,enabled&project_id=eq.${x.id}&enabled=eq.true`,{headers:supabaseHeaders,cache:"no-store"}),
  fetch(`${supabaseUrl}/rest/v1/project_economies?select=mode,chain,token_address&project_id=eq.${x.id}&limit=1`,{headers:supabaseHeaders,cache:"no-store"}),
  authHeaders ? fetch(`${supabaseUrl}/rest/v1/project_follows?select=project_id&project_id=eq.${x.id}&limit=1`,{headers:authHeaders,cache:"no-store"}) : Promise.resolve(null)
 ]);
 const sources=s.ok?await s.json() as Source[]:[], actions=a.ok?await a.json() as ActionRow[]:[], economies=e.ok?await e.json():[];
 const follows=f&&f.ok?await f.json() as Array<{project_id:string}>:[]; const source=sources[0];
 const project:Project={id:x.id,name:x.name,slug:x.slug,type:x.type,description:x.description??"",economy:x.economy,createdAt:x.created_at,actions:actions.filter(v=>v.enabled).map(v=>v.action),source:source?{kind:source.kind,reference:source.reference,status:source.status,verifiedAt:source.verified_at??undefined}:{kind:"other",reference:"",status:x.verification_status}};
 return NextResponse.json({project,economyDetail:economies[0]??null,isFollowing:follows.length>0,authenticated:Boolean(authHeaders)});
}
