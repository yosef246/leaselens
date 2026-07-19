/** Sign out: clears the Supabase session cookie, then redirects to /sign-in. */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // ?signedout=1 → the sign-in page shows a "logged out" toast.
  return NextResponse.redirect(new URL("/sign-in?signedout=1", request.url), { status: 303 });
}
