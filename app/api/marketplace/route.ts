import { NextResponse } from "next/server";
import { marketProfiles, searchMarketplace } from "@/lib/marketplace";

export async function GET(request: Request) {
  const params=new URL(request.url).searchParams;
  const query=(params.get("q")||"").slice(0,200),kind=params.get("kind")||"all",geography=params.get("geography")||"all";
  if(!["all",...marketProfiles.map(profile=>profile.kind)].includes(kind)||!["all",...marketProfiles.map(profile=>profile.geography)].includes(geography))return NextResponse.json({error:"Choose a supported profile type and region."},{status:400});
  return NextResponse.json({profiles:searchMarketplace(marketProfiles,query,kind,geography),kinds:[...new Set(marketProfiles.map(profile=>profile.kind))],geographies:[...new Set(marketProfiles.map(profile=>profile.geography))],collection:"Reviewed public-source directory",reviewedOn:"2026-10-23"},{headers:{"Cache-Control":"public, max-age=300"}});
}
