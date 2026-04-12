import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DomPurifyInstance = {
  sanitize: (
    dirty: string,
    cfg?: import("dompurify").Config
  ) => string;
};

let domPurifyPromise: Promise<DomPurifyInstance> | null = null;

async function getDomPurify(): Promise<DomPurifyInstance> {
  if (!domPurifyPromise) {
    domPurifyPromise = (async () => {
      const [{ default: createDOMPurify }, { JSDOM }] = await Promise.all([
        import("dompurify"),
        import("jsdom"),
      ]);
      return createDOMPurify(new JSDOM("").window as never) as DomPurifyInstance;
    })();
  }
  return domPurifyPromise;
}

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

    const domPurify = await getDomPurify();

    // Sanitize HTML - allow style tags and semantic HTML5 tags for CV templates
    const safeHtml = domPurify.sanitize(cv.html_content, {
      ALLOWED_TAGS: [
        // Document structure
        "html", "head", "body", "title", "meta", "link",
        // Container elements
        "div", "span", "p", 
        // Headers
        "h1", "h2", "h3", "h4", "h5", "h6",
        // Lists
        "ul", "ol", "li",
        // Text formatting
        "a", "strong", "em", "b", "i", "u", "br", "hr",
        // Tables
        "table", "thead", "tbody", "tr", "td", "th",
        // Media
        "img",
        // CSS
        "style",
        // Semantic HTML5
        "section", "article", "header", "footer", "main", "aside", "nav",
        // Other common
        "blockquote", "code", "pre", "sub", "sup", "small"
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "class", "style", "id", "target", "rel", "content", "name", "media"],
      ALLOW_DATA_ATTR: false,
      WHOLE_DOCUMENT: true,
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
