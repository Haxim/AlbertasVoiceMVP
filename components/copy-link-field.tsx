"use client";

import { useState } from "react";

export function CopyLinkField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-3 flex rounded-md border border-line bg-field focus-within:ring-2 focus-within:ring-spruce focus-within:ring-offset-2 focus-within:ring-offset-field">
      <input
        readOnly
        value={value}
        className="min-w-0 flex-1 rounded-l-md bg-transparent px-3 py-2 font-mono text-sm focus:outline-none"
      />
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy invitation link"
        title={copied ? "Copied" : "Copy link"}
        className="flex w-11 items-center justify-center rounded-r-md border-l border-line bg-white text-spruce hover:bg-field"
      >
        <span className="relative block h-5 w-5" aria-hidden="true">
          <span className="absolute left-1 top-0 h-3.5 w-3.5 rounded-sm border-2 border-current bg-white" />
          <span className="absolute bottom-0 right-1 h-3.5 w-3.5 rounded-sm border-2 border-current bg-white" />
        </span>
      </button>
    </div>
  );
}
