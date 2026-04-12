"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function CvPreviewPage() {
  const params = useParams();
  const id = params.id as string;
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for token from parent window via postMessage
    const handleMessage = (event: MessageEvent) => {
      // Security: verify origin (should be same origin)
      if (event.origin !== window.location.origin) {
        console.warn("Rejected message from different origin:", event.origin);
        return;
      }

      // Check if this is our auth token message
      if (event.data?.type === "AUTH_TOKEN" && event.data?.token) {
        loadCvHtml(event.data.token);
      }
    };

    window.addEventListener("message", handleMessage);

    // Notify parent that we're ready to receive token
    if (window.parent !== window) {
      window.parent.postMessage({ type: "PREVIEW_READY" }, window.location.origin);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [id]);

  const loadCvHtml = async (token: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/generated-cv/${id}/render`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError("Unauthorized - invalid or expired token");
        } else if (response.status === 403) {
          setError("Access denied");
        } else if (response.status === 404) {
          setError("CV not found");
        } else {
          setError("Failed to load CV");
        }
        return;
      }

      const htmlContent = await response.text();
      setHtml(htmlContent);
      
      // Notify parent that content is loaded
      if (window.parent !== window) {
        window.parent.postMessage({ type: "CONTENT_LOADED" }, window.location.origin);
      }
    } catch (err) {
      console.error("Error loading CV:", err);
      setError("Failed to load CV");
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div style={{ 
        padding: "40px", 
        textAlign: "center", 
        fontFamily: "system-ui, sans-serif",
        color: "#dc2626"
      }}>
        <p>{error}</p>
      </div>
    );
  }

  if (isLoading || !html) {
    return (
      <div style={{ 
        padding: "40px", 
        textAlign: "center", 
        fontFamily: "system-ui, sans-serif",
        color: "#666"
      }}>
        <p>Loading preview...</p>
      </div>
    );
  }

  // Render the HTML content with base styles
  return (
    <>
      <style>{`
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #f3f4f6 !important;
        }
        @media print {
          body {
            background: white !important;
          }
        }
      `}</style>
      <div 
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ 
          width: "210mm", 
          minHeight: "297mm",
          margin: "0 auto",
          background: "white",
        }}
      />
    </>
  );
}
