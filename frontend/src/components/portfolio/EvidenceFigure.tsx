import type { ReactNode } from "react";
import {
  evidenceStatusLabels,
  type EvidenceLocale,
  type EvidenceStatus,
} from "@/data/portfolioEvidence";

// Forest = independently reproduced; cream = quoted from the source as-is.
// Two warm neighbours rather than a green/blue split, so the pair reads as one
// scale of confidence instead of two unrelated categories.
const statusStyles: Record<EvidenceStatus, string> = {
  verified: "border-primary/25 bg-moss-wash text-primary",
  reported: "border-cream-deep bg-cream/70 text-secondary-foreground",
};

export default function EvidenceFigure({
  title,
  caption,
  source,
  status,
  locale,
  children,
}: {
  title: string;
  caption: string;
  source?: string;
  status: EvidenceStatus;
  locale: EvidenceLocale;
  children: ReactNode;
}) {
  return (
    <figure className="overflow-hidden border border-border-light bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline px-5 py-4 md:px-6">
        <h3 className="break-keep font-serif text-lg font-semibold tracking-tight">{title}</h3>
        <span
          className={`border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] ${statusStyles[status]}`}
        >
          {evidenceStatusLabels[status][locale]}
        </span>
      </div>
      <div className="p-5 md:p-6">{children}</div>
      <figcaption className="space-y-2 border-t border-hairline bg-surface-muted/45 px-5 py-4 font-sans text-xs leading-relaxed text-slate md:px-6">
        <p className="break-keep">{caption}</p>
        {source && (
          <p className="break-keep font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-slate">
            {locale === "ko" ? "근거" : "Source"} · {source}
          </p>
        )}
      </figcaption>
    </figure>
  );
}
