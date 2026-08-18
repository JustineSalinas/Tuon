"use client";

import Link from "next/link";
import { Download, FileSpreadsheet, FileText, Layers, Lock } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { PLANS, UPGRADE_TARGET, planCan } from "@/lib/ai/config";
import {
  downloadText,
  exportFilename,
  printHtml,
  toAnki,
  toCsv,
  toPrintableHtml,
  type ExportPayload,
} from "@/lib/export/study-set";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExportMenu({ payload }: { payload: ExportPayload | null }) {
  const { profile } = useAuth();
  const plan = profile?.plan ?? "free";
  const allowed = planCan(plan, "canExport");
  const upgrade = PLANS[UPGRADE_TARGET];

  const disabled = !payload || payload.flashcards.length === 0;

  function handleAnki() {
    if (!payload) return;
    downloadText(
      exportFilename(payload.studySet.title, "txt"),
      toAnki(payload),
      "text/plain",
    );
    toast.success("Anki file saved. Import it with File → Import in Anki.");
  }

  function handleCsv() {
    if (!payload) return;
    downloadText(
      exportFilename(payload.studySet.title, "csv"),
      toCsv(payload),
      "text/csv",
    );
    toast.success("CSV saved.");
  }

  function handlePdf() {
    if (!payload) return;
    printHtml(toPrintableHtml(payload));
    toast.info("Choose “Save as PDF” in the print dialog.");
  }

  if (!allowed) {
    return (
      <Button
        variant="outline"
        size="sm"
        render={<Link href="/app/settings" />}
        title={`Exporting is part of ${upgrade.name}`}
      >
        <Lock />
        Export
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" disabled={disabled}>
            <Download />
            Export
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="text-sm font-medium">Export this set</span>
          <span className="text-muted-foreground block text-xs">
            {payload?.flashcards.length ?? 0} flashcards
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleAnki}>
          <Layers className="size-4" />
          <div>
            <div>Anki deck</div>
            <div className="text-muted-foreground text-xs">Tab-separated .txt</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleCsv}>
          <FileSpreadsheet className="size-4" />
          <div>
            <div>Spreadsheet</div>
            <div className="text-muted-foreground text-xs">CSV for Excel or Sheets</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handlePdf}>
          <FileText className="size-4" />
          <div>
            <div>Printable PDF</div>
            <div className="text-muted-foreground text-xs">Cards and quiz with answer key</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
