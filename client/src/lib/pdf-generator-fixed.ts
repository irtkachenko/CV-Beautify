interface PdfFromUrlOptions {
  url?: string;
  htmlContent?: string;
  filename?: string;
  onLoadingChange?: (loading: boolean) => void;
  windowWidth?: number;
  contentWidthMm?: number;
}

interface PdfFromElementOptions {
  element: HTMLElement;
  filename?: string;
  onLoadingChange?: (loading: boolean) => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeTitle(filename: string): string {
  return filename.replace(/[\\/:*?"<>|]/g, "").trim() || "document.pdf";
}

function injectPrintStyle(doc: Document): void {
  const style = doc.createElement("style");
  style.textContent = `
    @page {
      margin: 0;
      size: A4;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .no-print {
      display: none !important;
    }
  `;
  doc.head.appendChild(style);
}

function copyStylesFromCurrentDocument(targetDoc: Document): void {
  const styleNodes = document.querySelectorAll('style, link[rel="stylesheet"]');
  for (const node of Array.from(styleNodes)) {
    targetDoc.head.appendChild(node.cloneNode(true));
  }
}

async function waitForImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  const waits = images.map((img) => {
    if (img.complete) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const cleanup = () => {
        img.removeEventListener("load", onDone);
        img.removeEventListener("error", onDone);
      };
      const onDone = () => {
        cleanup();
        resolve();
      };
      img.addEventListener("load", onDone, { once: true });
      img.addEventListener("error", onDone, { once: true });
    });
  });

  await Promise.all(waits);
}

async function waitForResources(win: Window): Promise<void> {
  const doc = win.document;
  if (doc.fonts?.ready) {
    try {
      await doc.fonts.ready;
    } catch {
      // Ignore font loading errors for print flow
    }
  }
  await waitForImages(doc);
  await delay(120);
}

function printAndWait(win: Window): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let finished = false;

    const finalize = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      win.removeEventListener("afterprint", onAfterPrint);
      setTimeout(() => {
        win.close();
        resolve();
      }, 120);
    };

    const onAfterPrint = () => finalize();

    const timeoutId = window.setTimeout(() => finalize(), 20000);
    win.addEventListener("afterprint", onAfterPrint, { once: true });

    try {
      win.focus();
      win.print();
    } catch (error) {
      clearTimeout(timeoutId);
      win.removeEventListener("afterprint", onAfterPrint);
      reject(error);
    }
  });
}

function createPrintWindow(): Window {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Failed to open print window");
  }
  return printWindow;
}

async function printElement(element: HTMLElement, filename: string): Promise<void> {
  const printWindow = createPrintWindow();
  const printDoc = printWindow.document;

  printDoc.open();
  printDoc.write("<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body></body></html>");
  printDoc.close();

  copyStylesFromCurrentDocument(printDoc);
  injectPrintStyle(printDoc);
  printDoc.title = sanitizeTitle(filename);
  printDoc.body.appendChild(element.cloneNode(true));

  await waitForResources(printWindow);
  await printAndWait(printWindow);
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Failed to fetch printable content: ${response.status}`);
  }
  return response.text();
}

function mountHtmlIntoPrintDocument(
  doc: Document,
  html: string,
  filename: string,
  baseUrl?: string,
): void {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");

  doc.open();
  doc.write("<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body></body></html>");
  doc.close();

  doc.title = sanitizeTitle(filename);

  if (baseUrl) {
    const base = doc.createElement("base");
    base.href = baseUrl;
    doc.head.appendChild(base);
  }

  for (const node of Array.from(parsed.head.childNodes)) {
    doc.head.appendChild(node.cloneNode(true));
  }

  injectPrintStyle(doc);

  while (doc.body.firstChild) {
    doc.body.removeChild(doc.body.firstChild);
  }

  for (const node of Array.from(parsed.body.childNodes)) {
    doc.body.appendChild(node.cloneNode(true));
  }
}

export class FixedPdfGenerator {
  static async generatePdfFromElement(
    element: HTMLElement,
    filename: string = "document.pdf",
  ): Promise<void> {
    await printElement(element, filename);
  }

  static async generatePdfFromElementIframe(
    element: HTMLElement,
    filename: string = "document.pdf",
  ): Promise<void> {
    await printElement(element, filename);
  }
}

export async function generatePdfFromUrl(options: PdfFromUrlOptions): Promise<void> {
  const {
    url,
    htmlContent,
    filename = "document.pdf",
    onLoadingChange,
  } = options;

  if (!url && !htmlContent) {
    throw new Error("Either url or htmlContent must be provided");
  }

  onLoadingChange?.(true);
  try {
    const html = htmlContent ?? (await fetchHtml(url!));
    const printWindow = createPrintWindow();
    mountHtmlIntoPrintDocument(printWindow.document, html, filename, url);
    await waitForResources(printWindow);
    await printAndWait(printWindow);
  } finally {
    onLoadingChange?.(false);
  }
}

export async function generatePdfFromElement(
  options: PdfFromElementOptions,
): Promise<void> {
  const { element, filename = "document.pdf", onLoadingChange } = options;

  onLoadingChange?.(true);
  try {
    await printElement(element, filename);
  } finally {
    onLoadingChange?.(false);
  }
}

export const generatePdfFromElementFixed =
  FixedPdfGenerator.generatePdfFromElement.bind(FixedPdfGenerator);
export const generatePdfFromElementIframeFixed =
  FixedPdfGenerator.generatePdfFromElementIframe.bind(FixedPdfGenerator);
