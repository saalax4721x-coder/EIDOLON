import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stages = new Set(["new","contacted","qualified","quoted","won","lost"]);
async function auth() {
  const token = (await cookies()).get("eidolon_access_token")?.value;
  if (!token) return null;
  const headers = { ...supabaseHeaders, Authorization: "Bearer " + token };
  const response = await fetch(supabaseUrl + "/auth/v1/user", { headers, cache: "no-store" });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id ? { id:user.id, headers } : null;
}
async function owns(companyId:string, user:{id:string;headers:Record<string,string>}) {
  const response = await fetch(supabaseUrl + "/rest/v1/companies?select=id&id=eq." + companyId + "&owner_id=eq." + user.id + "&limit=1", {headers:user.headers,cache:"no-store"});
  if (!response.ok) throw new Error("ownership verification unavailable");
  const companies = await response.json() as Array<{id:string}>;
  return companies.length > 0;
}
function validText(value:unknown,max:number,min=0) { return typeof value === "string" && value.trim().length >= min && value.length <= max; }
export async function GET(request:Request) {
  try {
    const user = await auth(); if (!user) return NextResponse.json({error:"Sign in required."},{status:401});
    const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
    if (!uuid.test(companyId)) return NextResponse.json({error:"Invalid company."},{status:400});
    if (!await owns(companyId,user)) return NextResponse.json({error:"Company not found."},{status:404});
    const response = await fetch(supabaseUrl + "/rest/v1/company_leads?select=id,name,contact,source,stage,notes,next_action,created_at,updated_at&company_id=eq." + companyId + "&order=created_at.desc&limit=100",{headers:user.headers,cache:"no-store"});
    if (!response.ok) return NextResponse.json({error:"Lead records unavailable. Apply the company pipeline migration."},{status:502});
    return NextResponse.json({leads:await response.json()});
  } catch { return NextResponse.json({error:"Lead service unavailable."},{status:503}); }
}
export async function POST(request:Request) {
  try {
    const user=await auth(); if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
    const body=await request.json();
    const {companyId,name,contact="",source="manual",notes="",nextAction=""}=body;
    if(!uuid.test(companyId??"")||!validText(name,160,2)||!validText(contact,320)||!validText(source,120)||!validText(notes,4000)||!validText(nextAction,500))
      return NextResponse.json({error:"Invalid lead details."},{status:400});
    if(!await owns(companyId,user))return NextResponse.json({error:"Company not found."},{status:404});
    const response=await fetch(supabaseUrl+"/rest/v1/company_leads",{method:"POST",headers:{...user.headers,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({company_id:companyId,created_by:user.id,name:name.trim(),contact:contact.trim(),source:source.trim()||"manual",notes:notes.trim(),next_action:nextAction.trim()})});
    if(!response.ok)return NextResponse.json({error:"Could not save lead."},{status:502});
    const records=await response.json();return NextResponse.json({lead:records[0]},{status:201});
  } catch {return NextResponse.json({error:"Lead service unavailable."},{status:503});}
}
export async function PATCH(request:Request) {
  try {
    const user=await auth();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
    const {companyId,leadId,stage,nextAction}=await request.json();
    if(!uuid.test(companyId??"")||!uuid.test(leadId??"")||!stages.has(stage)||!validText(nextAction??"",500))
      return NextResponse.json({error:"Invalid lead update."},{status:400});
    if(!await owns(companyId,user))return NextResponse.json({error:"Company not found."},{status:404});
    const response=await fetch(supabaseUrl+"/rest/v1/company_leads?id=eq."+leadId+"&company_id=eq."+companyId,{method:"PATCH",headers:{...user.headers,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({stage,next_action:(nextAction??"").trim(),updated_at:new Date().toISOString()})});
    if(!response.ok)return NextResponse.json({error:"Could not update lead."},{status:502});
    const records=await response.json();if(!records.length)return NextResponse.json({error:"Lead not found."},{status:404});
    return NextResponse.json({lead:records[0]});
  } catch {return NextResponse.json({error:"Lead service unavailable."},{status:503});}
}
