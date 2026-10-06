export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabaseHeaders = {
  apikey: supabasePublishableKey,
  "content-type": "application/json",
};
