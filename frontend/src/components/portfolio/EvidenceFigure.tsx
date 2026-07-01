import type { ReactNode } from "react";
import {
  evidenceStatusLabels,
  type EvidenceLocale,
  type EvidenceStatus,
} from "@/data/portfolioEvidence";

const statusStyles: Record<EvidenceStatus, string> = {
  verified: "border-accent/20 bg-accent/[0.06] text-accent",
  reported: "border-sky-700/15 bg-sky-50 text-sky-900",
  pending: "border-amber-700/15 bg-amber-50 text-amber-900",
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
    <figure className="overflow-hidden border border-black/5 bg-white/45">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/5 px-5 py-4 md:px-6">
        <h3 className="break-keep text-lg font-bold tracking-tight">{title}</h3>
        <span
          className={`border px-2.5 py-1 font-sans text-[9px] font-bold uppercase tracking-[0.14em] ${statusStyles[status]}`}
        >
          {evidenceStatusLabels[status][locale]}
        </span>
      </div>
      <div className="p-5 md:p-6">{children}</div>
      <figcaption className="space-y-2 border-t border-black/5 bg-surface-muted/45 px-5 py-4 font-sans text-xs leading-relaxed text-gray-500 md:px-6">
        <p className="break-keep">{caption}</p>
        {source && (
          <p className="break-keep text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
            {locale === "ko" ? "근거" : "Source"} · {source}
          </p>
        )}
      </figcaption>
    </figure>
  );
}

export function PendingEvidence({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-36 flex-col justify-end border border-dashed border-amber-800/25 bg-amber-50/55 p-5">
      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-amber-900/70">
        {label}
      </p>
      <p className="mt-2 break-keep font-sans text-sm leading-relaxed text-amber-950/75">
        {detail}
      </p>
    </div>
  );
}
