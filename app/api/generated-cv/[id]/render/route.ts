import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const domPurify = createDOMPurify(new JSDOM("").window as any);
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request);
    if ("response" in auth) {
      return auth.response;
    }
    const { supabase, userId } = auth;

    const cvId = parseInt(params.id, 10);
    if (isNaN(cvId)) {
      return NextResponse.json({ message: "Invalid CV id" }, { status: 400 });
    }

    const { data: cv, error } = await supabase
      .from("generated_cvs")
      .select("html_content, user_id")
      .eq("id", cvId)
      .single();

    if (error || !cv) {
      return NextResponse.json({ message: "CV not found" }, { status: 404 });
    }

    if (cv.user_id !== userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    if (!cv.html_content) {
      return NextResponse.json({ message: "Generated CV HTML not found" }, { status: 404 });
    }

    // Sanitize HTML
    const safeHtml = domPurify.sanitize(cv.html_content, {
      ALLOWED_TAGS: ["div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "strong", "em", "u", "br", "hr", "img", "table", "thead", "tbody", "tr", "td", "th"],
      ALLOWED_ATTR: ["href", "src", "alt", "class", "style", "id"],
    });

    return new NextResponse(safeHtml, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("CV render error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
