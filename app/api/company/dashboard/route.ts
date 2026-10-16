import { NextResponse } from "next/server";
import { companySession, companyOwned, companyData } from "@/lib/company-api";
import { uuid } from "@/lib/workflow";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await companySession();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
    if (!uuid.test(companyId)) return NextResponse.json({ error: "Invalid company" }, { status: 400 });
    if (!await companyOwned(companyId, user)) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    const stats = await companyData<Record<string, unknown>>(user, "rpc/company_dashboard", "POST", { p_company_id: companyId });
    return NextResponse.json({ ...stats, companyId, asOf: new Date().toISOString() });
  } catch { return NextResponse.json({ error: "Dashboard metrics unavailable. Check database migrations and retry." }, { status: 503 }); }
}
