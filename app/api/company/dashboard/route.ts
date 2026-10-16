import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {supabaseHeaders,supabaseUrl} from "@/lib/supabase-config";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sources={agents:"company_ai_agents",tasks:"company_tasks",leads:"company_leads",quotes:"company_quotes",jobs:"company_jobs",workflows:"company_workflows",sponsorOffers:"sponsorship_offers",sponsorApplications:"sponsorship_requests"} as const;
export async function GET(request:Request){
 try{
  const token=(await cookies()).get("eidolon_access_token")?.value;
  if(!token)return NextResponse.json({error:"Sign in required"},{status:401});
  const headers={...supabaseHeaders,Authorization:"Bearer "+token};
  const auth=await fetch(supabaseUrl+"/auth/v1/user",{headers,cache:"no-store"});
  if(!auth.ok)return NextResponse.json({error:"Sign in required"},{status:401});
  const user=await auth.json() as {id:string};
  const companyId=new URL(request.url).searchParams.get("companyId")??"";
  if(!uuid.test(companyId))return NextResponse.json({error:"Invalid company"},{status:400});
  const owned=await fetch(supabaseUrl+"/rest/v1/companies?select=id&id=eq."+companyId+"&owner_id=eq."+user.id+"&limit=1",{headers,cache:"no-store"});
  if(!owned.ok||!(await owned.json() as unknown[]).length)return NextResponse.json({error:"Company not found"},{status:404});
  const entries=await Promise.all(Object.entries(sources).map(async([key,table])=>{
   const column=key==="sponsorOffers"?"sponsor_company_id":key==="sponsorApplications"?"applicant_company_id":"company_id";
   const r=await fetch(supabaseUrl+"/rest/v1/"+table+"?select=id&"+column+"=eq."+companyId,{headers:{...headers,Prefer:"count=exact",Range:"0-0"},cache:"no-store"});
   if(!r.ok)throw Error("Metrics unavailable");
   const range=r.headers.get("content-range")??"";
   const count=Number(range.split("/")[1]);
   if(!Number.isFinite(count))throw Error("Metrics unavailable");
   return [key,count] as const;
  }));
  return NextResponse.json({companyId,counts:Object.fromEntries(entries),asOf:new Date().toISOString()});
 }catch{return NextResponse.json({error:"Dashboard metrics unavailable"},{status:503});}
}
