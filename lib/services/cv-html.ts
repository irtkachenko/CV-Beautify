export function extractHtmlFromModelResponse(response: string): string {
  const trimmed = response.trim();
  if (!trimmed) {
    return "";
  }

  const fencedHtmlMatch = trimmed.match(/```html\s*([\s\S]*?)```/i);
  if (fencedHtmlMatch?.[1]) {
    return fencedHtmlMatch[1].trim();
  }

  const genericFenceMatch = trimmed.match(/```\s*([\s\S]*?)```/i);
  if (genericFenceMatch?.[1] && /<[a-z!][\s\S]*>/i.test(genericFenceMatch[1])) {
    return genericFenceMatch[1].trim();
  }

  const documentStartMatch = trimmed.match(/<!doctype html|<html\b|<body\b/i);
  if (documentStartMatch?.index !== undefined) {
    const htmlSlice = trimmed.slice(documentStartMatch.index);
    const endMatch = htmlSlice.match(/<\/html>|<\/body>/i);
    if (endMatch?.index !== undefined) {
      return htmlSlice.slice(0, endMatch.index + endMatch[0].length).trim();
    }
    return htmlSlice.trim();
  }

  const firstTagMatch = trimmed.match(/<[a-z][^>]*>/i);
  if (firstTagMatch?.index !== undefined) {
    return trimmed.slice(firstTagMatch.index).trim();
  }

  return trimmed;
}

export function normalizeCommonMojibake(value: string): string {
  return value
    .replace(/\u00e2\u20ac\u00a2/g, "\u2022")
    .replace(/\u00e2\u20ac\u201c/g, "\u2013")
    .replace(/\u00e2\u20ac\u201d/g, "\u2014")
    .replace(/\u00e2\u20ac\u02dc/g, "\u2018")
    .replace(/\u00e2\u20ac\u2122/g, "\u2019")
    .replace(/\u00e2\u20ac\u0153/g, "\u201c")
    .replace(/\u00e2\u20ac\u009d/g, "\u201d")
    .replace(/\u00e2\u20ac\u00a6/g, "\u2026")
    .replace(/\u00c2 /g, " ")
    .replace(/\u00c2/g, "");
}

function extractStyleBlocks(html: string): string {
  const styleMatches = html.match(/<style[\s\S]*?<\/style>/gi) ?? [];
  const stylesheetLinks = html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) ?? [];
  return [...styleMatches, ...stylesheetLinks].join("\n");
}

export function ensureTemplateStyles(generatedHtml: string, fallbackTemplateHtml: string): string {
  if (/<style[\s\S]*?<\/style>/i.test(generatedHtml) || /rel=["']stylesheet["']/i.test(generatedHtml)) {
    return generatedHtml;
  }

  const styleBlock = extractStyleBlocks(fallbackTemplateHtml);
  if (!styleBlock) {
    return generatedHtml;
  }

  if (/<\/head>/i.test(generatedHtml)) {
    return generatedHtml.replace(/<\/head>/i, `${styleBlock}\n</head>`);
  }

  if (/<body[^>]*>/i.test(generatedHtml)) {
    return generatedHtml.replace(/<body[^>]*>/i, (match) => `${match}\n${styleBlock}\n`);
  }

  return `${styleBlock}\n${generatedHtml}`;
}
