import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseUrl,supabasePublishableKey } from "@/lib/supabase-config";
export const dynamic="force-dynamic";
export async function POST(){
 const store=await cookies(),refreshToken=store.get("eidolon_refresh_token")?.value;
 if(!refreshToken)return NextResponse.json({error:"No refresh session."},{status:401});
 const response=await fetch(supabaseUrl+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:supabasePublishableKey,"content-type":"application/json"},body:JSON.stringify({refresh_token:refreshToken}),cache:"no-store"});
 if(!response.ok){const result=NextResponse.json({error:"Session expired. Sign in again."},{status:401});result.cookies.delete("eidolon_access_token");result.cookies.delete("eidolon_refresh_token");return result;}
 const session=await response.json(),result=NextResponse.json({ok:true,expiresIn:session.expires_in??3600}),opts={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/"};
 result.cookies.set("eidolon_access_token",session.access_token,{...opts,maxAge:session.expires_in??3600});result.cookies.set("eidolon_refresh_token",session.refresh_token??refreshToken,{...opts,maxAge:60*60*24*365});return result;
}