"use client";

import Link from "next/link";
import { Download, FileSpreadsheet, FileText, Layers, Lock } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
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
  DropdownMenuHeader,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ExportMenu({ payload }: { payload: ExportPayload | null }) {
  const { profile } = useAuth();
  const { t } = useI18n();
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
    toast.success(t.exportSet.ankiSaved);
  }

  function handleCsv() {
    if (!payload) return;
    downloadText(
      exportFilename(payload.studySet.title, "csv"),
      toCsv(payload),
      "text/csv",
    );
    toast.success(t.exportSet.csvSaved);
  }

  function handlePdf() {
    if (!payload) return;
    printHtml(toPrintableHtml(payload));
    toast.info(t.exportSet.pdfHowTo);
  }

  if (!allowed) {
    return (
      <Button
        variant="outline"
        size="sm"
        render={<Link href="/app/settings" />}
        title={t.exportSet.lockedTitle(upgrade.name)}
      >
        <Lock />
        {t.exportSet.action}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" disabled={disabled}>
            <Download />
            {t.exportSet.action}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuHeader>
          <span className="text-sm font-medium">{t.exportSet.heading}</span>
          <span className="text-muted-foreground block text-xs">
            {t.sets.flashcards(payload?.flashcards.length ?? 0)}
          </span>
        </DropdownMenuHeader>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleAnki}>
          <Layers className="size-4" />
          <div>
            <div>{t.exportSet.anki}</div>
            <div className="text-muted-foreground text-xs">{t.exportSet.ankiHint}</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleCsv}>
          <FileSpreadsheet className="size-4" />
          <div>
            <div>{t.exportSet.spreadsheet}</div>
            <div className="text-muted-foreground text-xs">{t.exportSet.spreadsheetHint}</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handlePdf}>
          <FileText className="size-4" />
          <div>
            <div>{t.exportSet.pdf}</div>
            <div className="text-muted-foreground text-xs">{t.exportSet.pdfHint}</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
