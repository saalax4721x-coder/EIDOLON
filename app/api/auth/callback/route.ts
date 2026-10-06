import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseUrl,supabasePublishableKey } from "@/lib/supabase-config";
const safeNext=(v:string|undefined)=>v&&v.startsWith("/")&&!v.startsWith("//")?v:"/launch";
export async function GET(request:Request){
 const url=new URL(request.url),store=await cookies(),code=url.searchParams.get("code"),verifier=store.get("eidolon_pkce_verifier")?.value,destination=safeNext(url.searchParams.get("next")??store.get("eidolon_auth_next")?.value);
 if(!code||!verifier)return NextResponse.redirect(new URL("/?auth=error",request.url));
 const response=await fetch(supabaseUrl+"/auth/v1/token?grant_type=pkce",{method:"POST",headers:{apikey:supabasePublishableKey,"content-type":"application/json"},body:JSON.stringify({auth_code:code,code_verifier:decodeURIComponent(verifier)}),cache:"no-store"});
 if(!response.ok)return NextResponse.redirect(new URL("/?auth=error",request.url));
 const session=await response.json(),result=NextResponse.redirect(new URL(destination,request.url)),opts={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/"};
 result.cookies.set("eidolon_access_token",session.access_token,{...opts,maxAge:session.expires_in??3600});result.cookies.set("eidolon_refresh_token",session.refresh_token,{...opts,maxAge:60*60*24*365});result.cookies.delete("eidolon_pkce_verifier");result.cookies.delete("eidolon_auth_next");return result;
}