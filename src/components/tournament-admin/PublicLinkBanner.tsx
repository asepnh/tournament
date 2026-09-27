"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function PublicLinkBanner({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/t/${slug}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable, ignore
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-navy-200 bg-navy-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-navy-500">
          Public live results link
        </p>
        <a
          href={path}
          target="_blank"
          rel="noreferrer"
          className="break-all font-semibold text-navy-700 hover:underline"
        >
          {path}
        </a>
      </div>
      <Button variant="secondary" onClick={handleCopy} className="shrink-0">
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </div>
  );
}
