import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";
import { mapTemplateRow } from "@lib/cv-mappers";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("response" in auth) {
      return auth.response;
    }
    const { supabase } = auth;
    
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
