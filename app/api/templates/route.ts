import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@lib/supabase-server";
import { mapTemplateRow } from "@lib/cv-mappers";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Extract token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const cookies = request.headers.get('cookie');
    let accessToken = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    } else if (cookies) {
      // Try to extract from cookies (common pattern for Next.js auth)
      const cookieMatch = cookies.match(/sb-access-token=([^;]+)/);
      if (cookieMatch) {
        accessToken = decodeURIComponent(cookieMatch[1]);
      }
    }
    
    const supabase = createSupabaseServerClient(accessToken || undefined);
    
    // Try to fetch templates
    const { data: templates, error } = await supabase
      .from("cv_templates")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Templates fetch error:", error);
      return NextResponse.json({ message: "Failed to fetch templates" }, { status: 500 });
    }

    return NextResponse.json((templates || []).map(mapTemplateRow));
  } catch (error) {
    console.error("Templates route error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
