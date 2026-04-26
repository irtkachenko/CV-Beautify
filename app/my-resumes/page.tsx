"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useDeleteResume, useMyResumes } from "@/hooks/use-cvs";
import { Navbar } from "@/components/layout/Navbar";
import { CvStatusCard } from "@/components/CvStatusCard";
import { motion } from "framer-motion";
import { Loader2, FileX, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";

export default function MyResumesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: resumesData, isLoading, error, refresh } = useMyResumes({
    enabled: !!user,
    watchProcessing: true,
  });
  const { deleteResume, deletingId } = useDeleteResume();

  // Scroll to top on mount to ensure user sees the latest CVs (newest at top)
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/");
    }
  }, [isAuthLoading, user, router]);

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh pb-20 pt-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 border-b border-border/50 pb-6">
          <div>
            <Link href="/gallery" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" /> {t("common.back_to_gallery")}
            </Link>
            <h1 className="font-display text-4xl font-bold text-foreground">{t("my_resumes.title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("my_resumes.description")}
            </p>
            {resumesData && (
              <div className="mt-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  resumesData.canCreateMore 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {resumesData.count}/{resumesData.limit} CVs generated
                  {!resumesData.canCreateMore && ' - Limit reached'}
                </span>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-medium text-lg">{t("my_resumes.loading")}</p>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-xl text-center max-w-md mx-auto mt-20">
            <p className="font-bold text-lg">{t("my_resumes.error")}</p>
            <p className="text-sm mt-2">{t("my_resumes.error_desc")}</p>
          </div>
        ) : !resumesData || !resumesData.cvs || resumesData.cvs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center max-w-md mx-auto"
          >
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6 shadow-inner">
              <FileX className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="font-display font-bold text-2xl mb-2">{t("my_resumes.empty_title")}</h2>
            <p className="text-muted-foreground mb-8">
              {t("my_resumes.empty_desc")}
            </p>
            <Link
              href="/gallery"
              className="px-8 py-3 rounded-full font-bold text-white bg-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              {t("my_resumes.browse_templates")}
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            {resumesData.cvs.map((resume) => (
              <CvStatusCard
                key={resume.id}
                cv={resume}
                isDeleting={deletingId === resume.id}
                onDelete={async (id) => {
                  const deleted = await deleteResume(id);
                  if (deleted) {
                    refresh();
                  }
                  return deleted;
                }}
              />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
