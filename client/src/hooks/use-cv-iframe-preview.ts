import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject, SyntheticEvent } from "react";

type UseCvIframePreviewOptions = {
  containerRef: RefObject<HTMLDivElement>;
  sourceUrl?: string | null;
  paddingPx?: number;
  enabled?: boolean;
  defaultHeight?: string;
};

type UseCvIframePreviewResult = {
  scale: number;
  iframeHeight: string;
  iframeReady: boolean;
  handleIframeLoad: (e: SyntheticEvent<HTMLIFrameElement>) => void;
};

const CV_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PAGE_BOTTOM_SAFE_PX = 80;
const PAGE_TOP_PADDING_PX = 90;
const PAGE_DIVIDER_PX = 14;
const PAGE_LABEL_PREFIX = "Page";

function getOffsetTopFromContainer(element: HTMLElement, container: HTMLElement): number {
  let top = 0;
  let current: HTMLElement | null = element;

  while (current && current !== container) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return top;
}

function getBreakCandidates(container: HTMLElement): HTMLElement[] {
  const main = container.querySelector("main") as HTMLElement | null;
  if (!main) return [];

  const skipTags = new Set(["script", "style", "link", "meta", "noscript"]);
  const candidates: HTMLElement[] = [];

  for (const parent of Array.from(main.children)) {
    if (skipTags.has(parent.tagName.toLowerCase())) continue;
    for (const child of Array.from(parent.children)) {
      if (skipTags.has(child.tagName.toLowerCase())) continue;
      candidates.push(child as HTMLElement);
    }
  }

  return candidates;
}

function clearInjectedPageMarkers(doc: Document) {
  const markers = doc.querySelectorAll(
    ".cv-page-bottom-spacer, .cv-page-divider, .cv-page-top-spacer"
  );
  markers.forEach((marker) => marker.remove());
}

function applyPreviewPagination(iframe: HTMLIFrameElement) {
  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const container =
    (doc.querySelector(".container") as HTMLElement | null) ?? (doc.body as HTMLElement | null);
  if (!container) return;

  clearInjectedPageMarkers(doc);
  void container.offsetHeight;

  const bgColor = iframe.contentWindow?.getComputedStyle(container).backgroundColor || "#ffffff";
  const candidates = getBreakCandidates(container);

  for (const block of candidates) {
    const blockTop = getOffsetTopFromContainer(block, container);
    const blockBottom = blockTop + block.offsetHeight;

    const pageIndex = Math.floor(blockTop / A4_HEIGHT_PX);
    const currentPageEnd = (pageIndex + 1) * A4_HEIGHT_PX;
    const safeEnd = currentPageEnd - PAGE_BOTTOM_SAFE_PX;
    const relTop = blockTop - pageIndex * A4_HEIGHT_PX;
    const isAlreadyAtTop = relTop < PAGE_TOP_PADDING_PX + PAGE_DIVIDER_PX + 10;

    if (blockBottom <= safeEnd || isAlreadyAtTop) continue;

    const bottomSpacerHeight = Math.max(0, currentPageEnd - blockTop);

    const bottomSpacer = doc.createElement("div");
    bottomSpacer.className = "cv-page-bottom-spacer";
    bottomSpacer.style.cssText =
      `height:${bottomSpacerHeight}px !important;` +
      `min-height:${bottomSpacerHeight}px !important;` +
      `display:block !important;width:100% !important;` +
      `background:${bgColor} !important;margin:0 !important;padding:0 !important;`;

    const divider = doc.createElement("div");
    divider.className = "cv-page-divider";
    divider.style.cssText =
      `height:${PAGE_DIVIDER_PX}px !important;` +
      `min-height:${PAGE_DIVIDER_PX}px !important;` +
      "display:flex !important;width:100% !important;" +
      "align-items:center !important;justify-content:center !important;" +
      "margin:0 !important;padding:0 !important;background:transparent !important;";
    const dividerLabel = doc.createElement("span");
    dividerLabel.className = "cv-page-divider-label";
    dividerLabel.textContent = `${PAGE_LABEL_PREFIX} ${pageIndex + 2}`;
    divider.appendChild(dividerLabel);

    const topSpacer = doc.createElement("div");
    topSpacer.className = "cv-page-top-spacer";
    topSpacer.style.cssText =
      `height:${PAGE_TOP_PADDING_PX}px !important;` +
      `min-height:${PAGE_TOP_PADDING_PX}px !important;` +
      `display:block !important;width:100% !important;` +
      `background:${bgColor} !important;margin:0 !important;padding:0 !important;` +
      "box-sizing:border-box !important;overflow:hidden !important;line-height:0 !important;font-size:0 !important;";
    topSpacer.innerHTML = "&nbsp;";

    block.parentNode?.insertBefore(bottomSpacer, block);
    block.parentNode?.insertBefore(divider, block);
    block.parentNode?.insertBefore(topSpacer, block);

    void container.offsetHeight;
  }
}

function getMeasuredHeight(iframe: HTMLIFrameElement): number {
  const doc = iframe.contentWindow?.document;
  if (!doc) return 0;

  const body = doc.body;
  const html = doc.documentElement;
  if (!body || !html) return 0;

  return Math.max(
    body.scrollHeight,
    body.offsetHeight,
    html.clientHeight,
    html.scrollHeight,
    html.offsetHeight
  );
}

function applyPreviewStyles(iframe: HTMLIFrameElement) {
  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const styleId = "__cv_preview_iframe_styles";
  if (doc.getElementById(styleId)) return;

  const style = doc.createElement("style");
  style.id = styleId;
  style.textContent = `
    body {
      margin: 0 !important;
    }

    .cv-page-divider {
      position: relative;
    }

    .cv-page-divider::before {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      border-top: 2px dashed #9ca3af;
      transform: translateY(-50%);
      pointer-events: none;
    }

    .cv-page-divider-label {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 18px;
      padding: 0 8px;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #475569;
      font-size: 10px;
      line-height: 1;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    @media print {
      .cv-page-divider {
        display: none !important;
      }
    }
  `;
  doc.head?.appendChild(style);
}

export function useCvIframePreview({
  containerRef,
  sourceUrl = null,
  paddingPx = 0,
  enabled = true,
  defaultHeight = "297mm",
}: UseCvIframePreviewOptions): UseCvIframePreviewResult {
  const [scale, setScale] = useState(1);
  const [iframeHeight, setIframeHeight] = useState(defaultHeight);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeWatchCleanupRef = useRef<(() => void) | null>(null);
  const measuredHeightRef = useRef(0);

  const scaleDepsKey = useMemo(
    () => `${enabled ? 1 : 0}:${paddingPx}:${sourceUrl || ""}`,
    [enabled, paddingPx, sourceUrl]
  );

  useEffect(() => {
    if (!enabled) return;

    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const availableWidth = Math.max(0, containerWidth - paddingPx);
      setScale(availableWidth < CV_WIDTH_PX ? availableWidth / CV_WIDTH_PX : 1);
    };

    updateScale();
    const raf = window.requestAnimationFrame(updateScale);
    const timer = window.setTimeout(updateScale, 120);

    window.addEventListener("resize", updateScale);

    let observer: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateScale());
      observer.observe(containerRef.current);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateScale);
      observer?.disconnect();
    };
  }, [containerRef, scaleDepsKey, paddingPx, enabled]);

  useEffect(() => {
    if (!enabled) return;
    setIframeReady(false);
    setIframeHeight(defaultHeight);
    measuredHeightRef.current = 0;
    iframeWatchCleanupRef.current?.();
    iframeWatchCleanupRef.current = null;
  }, [enabled, sourceUrl, defaultHeight]);

  useEffect(() => {
    return () => {
      iframeWatchCleanupRef.current?.();
      iframeWatchCleanupRef.current = null;
    };
  }, []);

  const handleIframeLoad = useCallback((e: SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;

    try {
      applyPreviewStyles(iframe);

      const measureAndCommit = () => {
        const height = getMeasuredHeight(iframe);
        if (height > 0) {
          const nextHeight = Math.ceil(height);
          if (nextHeight > measuredHeightRef.current) {
            measuredHeightRef.current = nextHeight;
            setIframeHeight(`${nextHeight}px`);
          }
        }
        setIframeReady(true);
      };

      const paginateAndMeasure = () => {
        applyPreviewPagination(iframe);
        measureAndCommit();
      };

      iframeWatchCleanupRef.current?.();
      iframeWatchCleanupRef.current = null;

      const iframeWindow = iframe.contentWindow;
      const doc = iframeWindow?.document;
      if (iframeWindow && doc && typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(() => {
          window.requestAnimationFrame(measureAndCommit);
        });
        observer.observe(doc.documentElement);
        if (doc.body) observer.observe(doc.body);

        const onIframeResize = () => window.requestAnimationFrame(measureAndCommit);
        iframeWindow.addEventListener("resize", onIframeResize);

        iframeWatchCleanupRef.current = () => {
          observer.disconnect();
          iframeWindow.removeEventListener("resize", onIframeResize);
        };
      }

      window.requestAnimationFrame(paginateAndMeasure);
      window.setTimeout(paginateAndMeasure, 120);
      window.setTimeout(paginateAndMeasure, 420);

      const fonts = iframe.contentWindow?.document?.fonts;
      if (fonts?.ready) {
        fonts.ready
          .then(() => {
            window.requestAnimationFrame(paginateAndMeasure);
          })
          .catch(() => {
            setIframeReady(true);
          });
      }

      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        const pendingImages = Array.from(iframeDoc.images).filter((img) => !img.complete);
        if (pendingImages.length > 0) {
          Promise.all(
            pendingImages.map(
              (img) =>
                new Promise<void>((resolve) => {
                  const done = () => resolve();
                  img.addEventListener("load", done, { once: true });
                  img.addEventListener("error", done, { once: true });
                })
            )
          ).then(() => {
            window.requestAnimationFrame(paginateAndMeasure);
          });
        }
      }
    } catch (err) {
      console.error("Could not access iframe content for preview sizing:", err);
      setIframeHeight(defaultHeight);
      setIframeReady(true);
    }
  }, [defaultHeight]);

  return { scale, iframeHeight, iframeReady, handleIframeLoad };
}
