"use client";

import type { CvTemplate } from "@shared/routes";
import { SmartImage } from "@/components/ui/smart-image";

export function TemplatePreview({ template }: { template: CvTemplate }) {
  return (
    <div className="w-full border-b md:border-b-0 md:border-r border-border/50 bg-secondary/20 p-4 overflow-y-auto">
      <div className="rounded-xl overflow-hidden bg-background border border-border/60">
        <SmartImage src={template.screenshotUrl} alt={template.name} imgClassName="w-full h-auto object-cover" />
      </div>
      <h3 className="mt-3 font-semibold text-foreground">{template.name}</h3>
      {template.description ? <p className="mt-1 text-sm text-muted-foreground">{template.description}</p> : null}
    </div>
  );
}
