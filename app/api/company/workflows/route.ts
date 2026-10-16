import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {supabaseHeaders,supabaseUrl} from "@/lib/supabase-config";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Node={id:string;type:string;label:string;agentId?:string;x:number;y:number};
type Edge={id:string;source:string;target:string};
async function session(){
 const token=(await cookies()).get("eidolon_access_token")?.value;
 if(!token)return null;
 const headers={...supabaseHeaders,Authorization:"Bearer "+token};
 const r=await fetch(supabaseUrl+"/auth/v1/user",{headers,cache:"no-store"});
 if(!r.ok)return null;
 const user=await r.json() as {id?:string};
 return user.id?{id:user.id,headers}:null;
}
async function owner(companyId:string,user:{id:string;headers:Record<string,string>}){
 if(!uuid.test(companyId))return false;
 const r=await fetch(supabaseUrl+"/rest/v1/companies?select=id&id=eq."+companyId+"&owner_id=eq."+user.id+"&limit=1",{headers:user.headers,cache:"no-store"});
 if(!r.ok)throw Error("Ownership check failed");
 return ((await r.json()) as unknown[]).length===1;
}
function validGraph(nodes:unknown,edges:unknown){
 if(!Array.isArray(nodes)||!Array.isArray(edges)||nodes.length>50||edges.length>100)return false;
 const ids=new Set<string>();
 for(const n of nodes as Node[]){
  if(!n||typeof n.id!=="string"||!uuid.test(n.id)||ids.has(n.id)||!["trigger","agent","review","end"].includes(n.type)||typeof n.label!=="string"||n.label.trim().length<1||n.label.length>100||!Number.isFinite(n.x)||!Number.isFinite(n.y)||Math.abs(n.x)>10000||Math.abs(n.y)>10000||n.agentId!==undefined&&(typeof n.agentId!=="string"||!uuid.test(n.agentId)))return false;
  ids.add(n.id);
 }
 const adj=new Map<string,string[]>();const edgeIds=new Set<string>();
 for(const e of edges as Edge[]){
  if(!e||!uuid.test(e.id)||edgeIds.has(e.id)||!ids.has(e.source)||!ids.has(e.target)||e.source===e.target)return false;
  edgeIds.add(e.id);adj.set(e.source,[...(adj.get(e.source)??[]),e.target]);
 }
 const visiting=new Set<string>(),visited=new Set<string>();
 function cycle(id:string):boolean{
  if(visiting.has(id))return true;if(visited.has(id))return false;
  visiting.add(id);for(const next of adj.get(id)??[])if(cycle(next))return true;
  visiting.delete(id);visited.add(id);return false;
 }
 return ![...ids].some(id=>cycle(id));
}
export async function GET(request:Request){
 try{
  const user=await session();if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
  const companyId=new URL(request.url).searchParams.get("companyId")??"";
  if(!await owner(companyId,user))return NextResponse.json({error:"Company not found"},{status:404});
  const r=await fetch(supabaseUrl+"/rest/v1/company_workflows?select=id,name,description,nodes,edges,status,created_at,updated_at&company_id=eq."+companyId+"&order=updated_at.desc&limit=100",{headers:user.headers,cache:"no-store"});
  if(!r.ok)throw Error("Read failed");
  return NextResponse.json({workflows:await r.json()});
 }catch{return NextResponse.json({error:"Workflows unavailable"},{status:503});}
}
export async function POST(request:Request){
 try{
  const user=await session();if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
  const body=await request.json();
  if(!await owner(body.companyId??"",user))return NextResponse.json({error:"Company not found"},{status:404});
  if(typeof body.name!=="string"||body.name.trim().length<2||body.name.length>120||typeof (body.description??"")!=="string"||(body.description??"").length>1000||!validGraph(body.nodes,body.edges))return NextResponse.json({error:"Invalid workflow graph"},{status:400});
  const r=await fetch(supabaseUrl+"/rest/v1/company_workflows",{method:"POST",headers:{...user.headers,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({company_id:body.companyId,created_by:user.id,name:body.name.trim(),description:body.description??"",nodes:body.nodes,edges:body.edges})});
  if(!r.ok)throw Error("Write failed");
  return NextResponse.json({workflow:(await r.json())[0]},{status:201});
 }catch{return NextResponse.json({error:"Unable to create workflow"},{status:503});}
}
export async function PATCH(request:Request){
 try{
  const user=await session();if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
  const body=await request.json();
  if(!await owner(body.companyId??"",user))return NextResponse.json({error:"Company not found"},{status:404});
  if(!uuid.test(body.id??"")||typeof body.name!=="string"||body.name.trim().length<2||body.name.length>120||!validGraph(body.nodes,body.edges)||!["draft","active","archived"].includes(body.status))return NextResponse.json({error:"Invalid workflow"},{status:400});
  const r=await fetch(supabaseUrl+"/rest/v1/company_workflows?id=eq."+body.id+"&company_id=eq."+body.companyId,{method:"PATCH",headers:{...user.headers,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({name:body.name.trim(),nodes:body.nodes,edges:body.edges,status:body.status,updated_at:new Date().toISOString()})});
  if(!r.ok)throw Error("Update failed");
  const rows=await r.json();if(!rows.length)return NextResponse.json({error:"Workflow not found"},{status:404});
  return NextResponse.json({workflow:rows[0]});
 }catch{return NextResponse.json({error:"Unable to save workflow"},{status:503});}
}
