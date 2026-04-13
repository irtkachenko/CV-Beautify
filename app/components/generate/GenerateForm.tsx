"use client";

import { Upload, X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type React from "react";

type GenerateFormProps = {
  onSubmit: (e: React.FormEvent) => Promise<void> | void;
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  isPending: boolean;
  generationPrompt: string;
  onPromptChange: (prompt: string) => void;
};

export function GenerateForm({
  onSubmit,
  selectedFile,
  onFileSelect,
  onFileRemove,
  isPending,
  generationPrompt,
  onPromptChange,
}: GenerateFormProps) {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="w-full p-6 flex flex-col gap-4">
      <h3 className="text-xl font-bold text-foreground">{t("modal.upload_cv") || "Upload CV"}</h3>
      <p className="text-sm text-muted-foreground">
        {t("modal.upload_hint") || "Upload a .docx file to generate a polished CV."}
      </p>

      <label className="border-2 border-dashed border-border rounded-xl p-5 cursor-pointer hover:border-primary/40 transition-colors">
        <input
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          disabled={isPending}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) onFileSelect(file);
          }}
        />
        <div className="flex items-center gap-3 text-sm text-foreground">
          <Upload className="w-4 h-4" />
          <span>{selectedFile ? selectedFile.name : t("modal.choose_file") || "Choose .docx file"}</span>
        </div>
      </label>

      {selectedFile ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm">
          <span className="truncate mr-2">{selectedFile.name}</span>
          <button
            type="button"
            onClick={onFileRemove}
            disabled={isPending}
            className="p-1 rounded hover:bg-secondary"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="prompt" className="text-sm font-medium text-foreground">
          {t("modal.prompt_label") || "Additional Instructions (optional)"}
        </label>
        <textarea
          id="prompt"
          value={generationPrompt}
          onChange={(e) => onPromptChange(e.target.value)}
          disabled={isPending}
          placeholder={t("modal.prompt_placeholder") || "Add specific requirements or preferences for your CV generation..."}
          className="w-full min-h-[80px] px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          maxLength={500}
        />
        <div className="text-xs text-muted-foreground text-right">
          {generationPrompt.length}/500
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || !selectedFile}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-50"
        onClick={(e) => {
          e.preventDefault();
          if (!isPending && selectedFile) {
            onSubmit(e);
          }
        }}
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        <span>{isPending ? t("common.generating") || "Generating..." : t("common.generate") || "Generate CV"}</span>
      </button>
    </form>
  );
}
