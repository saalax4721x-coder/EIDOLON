import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text=(value:unknown,min:number,max:number):value is string=>typeof value==="string"&&value.trim().length>=min&&value.length<=max;
async function session(){
 const token=(await cookies()).get("eidolon_access_token")?.value;
 if(!token)return null;
 const headers={...supabaseHeaders,Authorization:"Bearer "+token};
 const response=await fetch(supabaseUrl+"/auth/v1/user",{headers,cache:"no-store"});
 if(!response.ok)return null;
 const user=await response.json() as {id?:string};
 return user.id?{id:user.id,headers}:null;
}
async function owns(id:string,user:{id:string;headers:Record<string,string>}){
 const r=await fetch(supabaseUrl+"/rest/v1/companies?select=id&id=eq."+id+"&owner_id=eq."+user.id+"&limit=1",{headers:user.headers,cache:"no-store"});
 if(!r.ok)throw Error("Owner verification unavailable");
 return ((await r.json()) as Array<{id:string}>).length>0;
}
async function readRows(url:string,headers:Record<string,string>){
 const r=await fetch(url,{headers,cache:"no-store"});
 if(!r.ok)throw Error("Sponsorship records unavailable");
 return r.json();
}
export async function GET(request:Request){
 try{
 const user=await session();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const p=new URL(request.url).searchParams,companyId=p.get("companyId")??"";
 if(!uuid.test(companyId)||!await owns(companyId,user))return NextResponse.json({error:"Company not found."},{status:404});
 const base=supabaseUrl+"/rest/v1/";
 const [offers,applications,inbox]=await Promise.all([
  readRows(base+"sponsorship_offers?select=*&or=(status.eq.published,sponsor_company_id.eq."+companyId+")&order=created_at.desc&limit=100",user.headers),
  readRows(base+"sponsorship_requests?select=*&applicant_company_id=eq."+companyId+"&order=created_at.desc&limit=100",user.headers),
  readRows(base+"sponsorship_requests?select=*&sponsor_company_id=eq."+companyId+"&order=created_at.desc&limit=100",user.headers)
 ]);
 return NextResponse.json({offers,applications,inbox});
 }catch{return NextResponse.json({error:"Sponsorship marketplace unavailable."},{status:503});}
}
export async function POST(request:Request){
 try{
 const user=await session();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json() as Record<string,unknown>;
 const companyId=body.companyId,kind=body.kind;
 if(typeof companyId!=="string"||!uuid.test(companyId)||!await owns(companyId,user))return NextResponse.json({error:"Company not found."},{status:404});
 let table="",values:Record<string,unknown>={created_by:user.id};
 if(kind==="offer"){
  if(!text(body.title,5,180)||!text(body.description,20,4000)||!text(body.categories??"",0,300)||!text(body.eligibility??"",0,1000)||!text(body.budgetNote??"",0,240))return NextResponse.json({error:"Invalid sponsorship offer."},{status:400});
  const company=await readRows(supabaseUrl+"/rest/v1/companies?select=name&id=eq."+companyId+"&limit=1",user.headers) as Array<{name:string}>;
  if(!company[0])return NextResponse.json({error:"Sponsor company not found."},{status:404});
  table="sponsorship_offers";values={...values,sponsor_name:company[0].name,sponsor_company_id:companyId,title:body.title.trim(),description:body.description.trim(),categories:(body.categories as string??"").trim(),eligibility:(body.eligibility as string??"").trim(),budget_note:(body.budgetNote as string??"").trim()};
 }else if(kind==="application"){
  if(typeof body.offerId!=="string"||!uuid.test(body.offerId)||!text(body.pitch,30,4000)||!text(body.requestedSupport,5,500))return NextResponse.json({error:"Invalid sponsorship application."},{status:400});
  const offers=await readRows(supabaseUrl+"/rest/v1/sponsorship_offers?select=id,sponsor_company_id&status=eq.published&id=eq."+body.offerId+"&limit=1",user.headers) as Array<{id:string;sponsor_company_id:string}>;
  const offer=offers[0];if(!offer||offer.sponsor_company_id===companyId)return NextResponse.json({error:"Offer not available for this company."},{status:400});
  table="sponsorship_requests";values={...values,offer_id:offer.id,sponsor_company_id:offer.sponsor_company_id,applicant_company_id:companyId,pitch:body.pitch.trim(),requested_support:body.requestedSupport.trim()};
 }else return NextResponse.json({error:"Invalid action."},{status:400});
 const r=await fetch(supabaseUrl+"/rest/v1/"+table,{method:"POST",headers:{...user.headers,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(values)});
 if(!r.ok)return NextResponse.json({error:r.status===409?"An application already exists for this offer.":"Could not save sponsorship record."},{status:r.status===409?409:502});
 return NextResponse.json({record:(await r.json())[0]},{status:201});
 }catch{return NextResponse.json({error:"Sponsorship service unavailable."},{status:503});}
}
export async function PATCH(request:Request){
 try{
 const user=await session();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const {companyId,kind,recordId,status}=await request.json();
 if(!uuid.test(companyId??"")||!uuid.test(recordId??"")||!await owns(companyId,user))return NextResponse.json({error:"Company not found."},{status:404});
 const offer=kind==="offer",application=kind==="application";
 if((!offer&&!application)||(offer&&!["published","paused","closed"].includes(status))||(application&&!["submitted","reviewing","accepted","declined"].includes(status)))return NextResponse.json({error:"Invalid status."},{status:400});
 const table=offer?"sponsorship_offers":"sponsorship_requests";
 const r=await fetch(supabaseUrl+"/rest/v1/"+table+"?id=eq."+recordId+"&sponsor_company_id=eq."+companyId,{method:"PATCH",headers:{...user.headers,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({status,updated_at:new Date().toISOString()})});
 if(!r.ok)return NextResponse.json({error:"Could not update sponsorship status."},{status:502});
 const rows=await r.json();if(!rows.length)return NextResponse.json({error:"Record not found."},{status:404});
 return NextResponse.json({record:rows[0]});
 }catch{return NextResponse.json({error:"Sponsorship service unavailable."},{status:503});}
}
