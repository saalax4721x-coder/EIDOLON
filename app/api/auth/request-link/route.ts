import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { supabaseUrl, supabasePublishableKey } from "@/lib/supabase-config";
const base64Url=(input:Buffer)=>input.toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
export async function POST(request:Request){
 const {email,next}=await request.json().catch(()=>({}));
 if(typeof email!=="string"||!email.includes("@"))return NextResponse.json({error:"Enter a valid email."},{status:400});
 const destination=typeof next==="string"&&next.startsWith("/")&&!next.startsWith("//")?next:"/launch";
 const verifier=base64Url(randomBytes(32)),challenge=base64Url(createHash("sha256").update(verifier).digest()),origin=new URL(request.url).origin;
 const response=await fetch(supabaseUrl+"/auth/v1/otp",{method:"POST",headers:{apikey:supabasePublishableKey,"content-type":"application/json"},body:JSON.stringify({email:email.trim().toLowerCase(),create_user:true,data:{},options:{email_redirect_to:origin+"/api/auth/callback?next="+encodeURIComponent(destination),code_challenge:challenge,code_challenge_method:"s256"}})});
 if(!response.ok)return NextResponse.json({error:(await response.text())||"Unable to send sign-in link."},{status:response.status});
 const result=NextResponse.json({ok:true}),opts={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/"};
 result.cookies.set("eidolon_pkce_verifier",verifier,{...opts,maxAge:600});result.cookies.set("eidolon_auth_next",destination,{...opts,maxAge:600});return result;
}