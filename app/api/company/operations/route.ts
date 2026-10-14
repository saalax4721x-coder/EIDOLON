import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseHeaders, supabaseUrl } from "@/lib/supabase-config";

export const dynamic = "force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const config={
 quotes:{table:"company_quotes",statuses:["draft","sent","accepted","declined"]},
 jobs:{table:"company_jobs",statuses:["planned","scheduled","in_progress","completed","cancelled"]}
} as const;
type Kind=keyof typeof config;
function kind(value:unknown):value is Kind{return value==="quotes"||value==="jobs";}
function str(value:unknown,max:number,min=0):value is string{return typeof value==="string"&&value.trim().length>=min&&value.length<=max;}
async function session(){
 const token=(await cookies()).get("eidolon_access_token")?.value;
 if(!token)return null;
 const headers={...supabaseHeaders,Authorization:"Bearer "+token};
 const response=await fetch(supabaseUrl+"/auth/v1/user",{headers,cache:"no-store"});
 if(!response.ok)return null;
 const user=await response.json() as {id?:string};
 return user.id?{id:user.id,headers}:null;
}
async function owner(companyId:string,user:{id:string;headers:Record<string,string>}){
 const r=await fetch(supabaseUrl+"/rest/v1/companies?select=id&id=eq."+companyId+"&owner_id=eq."+user.id+"&limit=1",{headers:user.headers,cache:"no-store"});
 if(!r.ok)throw Error("Owner verification failed");
 return ((await r.json()) as Array<{id:string}>).length>0;
}
export async function GET(request:Request){
 try{
 const user=await session();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const params=new URL(request.url).searchParams,companyId=params.get("companyId")??"",resource=params.get("resource");
 if(!uuid.test(companyId)||!kind(resource))return NextResponse.json({error:"Invalid company or resource."},{status:400});
 if(!await owner(companyId,user))return NextResponse.json({error:"Company not found."},{status:404});
 const r=await fetch(supabaseUrl+"/rest/v1/"+config[resource].table+"?select=*&company_id=eq."+companyId+"&order=created_at.desc&limit=100",{headers:user.headers,cache:"no-store"});
 if(!r.ok)return NextResponse.json({error:"Records unavailable."},{status:502});
 return NextResponse.json({records:await r.json()});
 }catch{return NextResponse.json({error:"Operations service unavailable."},{status:503});}
}
export async function POST(request:Request){
 try{
 const user=await session();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const body=await request.json(),{companyId,resource,leadId,title,description=""}=body;
 if(!uuid.test(companyId??"")||!kind(resource)||!uuid.test(leadId??"")||!str(title,180,2)||!str(description,4000))return NextResponse.json({error:"Invalid details."},{status:400});
 if(!await owner(companyId,user))return NextResponse.json({error:"Company not found."},{status:404});
 let values:Record<string,unknown>={company_id:companyId,lead_id:leadId,created_by:user.id,title:title.trim(),description:description.trim()};
 if(resource==="quotes"){
  const amount=body.amount,currency=body.currency??"USD";
  if(typeof amount!=="number"||!Number.isFinite(amount)||amount<0||amount>999999999999.99||Math.round(amount*100)/100!==amount||!str(currency,3,3)||!/^[A-Z]{3}$/.test(currency))return NextResponse.json({error:"Invalid quote amount or currency."},{status:400});
  values={...values,amount,currency};
 }else{
  const scheduledAt=body.scheduledAt;
  if(scheduledAt!==undefined&&scheduledAt!==null&&(!str(scheduledAt,40,10)||Number.isNaN(Date.parse(scheduledAt))))return NextResponse.json({error:"Invalid schedule."},{status:400});
  if(scheduledAt)values.scheduled_at=new Date(scheduledAt).toISOString();
 }
 const r=await fetch(supabaseUrl+"/rest/v1/"+config[resource].table,{method:"POST",headers:{...user.headers,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(values)});
 if(!r.ok)return NextResponse.json({error:"Could not save record. Confirm the selected lead belongs to this company."},{status:502});
 const rows=await r.json();return NextResponse.json({record:rows[0]},{status:201});
 }catch{return NextResponse.json({error:"Operations service unavailable."},{status:503});}
}
export async function PATCH(request:Request){
 try{
 const user=await session();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const {companyId,resource,recordId,status}=await request.json();
 if(!uuid.test(companyId??"")||!uuid.test(recordId??"")||!kind(resource)||!config[resource].statuses.some(s=>s===status))return NextResponse.json({error:"Invalid update."},{status:400});
 if(!await owner(companyId,user))return NextResponse.json({error:"Company not found."},{status:404});
 const r=await fetch(supabaseUrl+"/rest/v1/"+config[resource].table+"?id=eq."+recordId+"&company_id=eq."+companyId,{method:"PATCH",headers:{...user.headers,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({status,updated_at:new Date().toISOString()})});
 if(!r.ok)return NextResponse.json({error:"Could not update record."},{status:502});
 const rows=await r.json();if(!rows.length)return NextResponse.json({error:"Record not found."},{status:404});
 return NextResponse.json({record:rows[0]});
 }catch{return NextResponse.json({error:"Operations service unavailable."},{status:503});}
}
