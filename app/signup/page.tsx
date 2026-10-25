import { redirect } from "next/navigation";
import { safeAuthNext } from "@/lib/auth-redirect";
export default async function SignUp({searchParams}:{searchParams:Promise<{next?:string}>}) { const query=await searchParams;redirect(`/auth?next=${encodeURIComponent(safeAuthNext(query.next))}`); }
