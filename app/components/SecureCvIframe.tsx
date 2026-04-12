"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@lib/supabase";

interface SecureCvIframeProps {
  cvId: number;
  onLoad?: (e: React.SyntheticEvent<HTMLIFrameElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export function SecureCvIframe({ 
  cvId, 
  onLoad, 
  className, 
  style, 
  title 
}: SecureCvIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [tokenSent, setTokenSent] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: verify origin
      if (event.origin !== window.location.origin) {
        console.warn("Rejected message from different origin:", event.origin);
        return;
      }

      // Iframe is ready to receive token
      if (event.data?.type === "PREVIEW_READY") {
        setIsReady(true);
      }
      
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Send token when iframe is ready
  useEffect(() => {
    if (!isReady || tokenSent || !iframeRef.current) return;

    const sendToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.error("No session available");
          setHasError(true);
          return;
        }

        // Send token to iframe via postMessage
        iframeRef.current?.contentWindow?.postMessage(
          { 
            type: "AUTH_TOKEN", 
            token: session.access_token 
          },
          window.location.origin
        );

        setTokenSent(true);
      } catch (err) {
        console.error("Error sending token:", err);
        setHasError(true);
      }
    };

    sendToken();
  }, [isReady, tokenSent]);

  const handleIframeLoad = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
    // Iframe loaded, but we wait for PREVIEW_READY message before sending token
    onLoad?.(e);
  }, [onLoad]);

  if (hasError) {
    return (
      <div 
        className={className}
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
          color: "#dc2626",
        }}
      >
        <p>Failed to load preview</p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={`/cv-preview/${cvId}`}
      onLoad={handleIframeLoad}
      className={className}
      style={{
        ...style,
        border: "none",
        opacity: tokenSent ? 1 : 0.5,
        transition: "opacity 0.2s",
      }}
      title={title || "CV Preview"}
      sandbox="allow-same-origin allow-scripts"
    />
  );
}
