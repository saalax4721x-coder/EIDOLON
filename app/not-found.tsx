import Link from "next/link";
import { ContentPage } from "@/components/content-page";
export default function NotFound() { return <ContentPage eyebrow="404 · Page not found" title="This path ends here." intro="The page may have moved, or the address may be incomplete."><div className="phero-ctas"><Link href="/" className="btn">Back to EIDOLON</Link><Link href="/help" className="btn btn--quiet">Get help</Link></div></ContentPage>; }
