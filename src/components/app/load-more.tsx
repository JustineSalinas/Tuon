"use client";

import { ChevronDown } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/lib/hooks/use-firestore";

/**
 * Footer for a paginated list.
 *
 * Also carries the honest caveat that search only covers what is loaded —
 * filtering happens in the browser over the current page, so a student with a
 * long library would otherwise think a note had disappeared.
 */
export function LoadMore({
  hasMore,
  loadMore,
  loadedCount,
  searching,
  noun,
}: {
  hasMore: boolean;
  loadMore: () => void;
  loadedCount: number;
  /** True when a search box is filtering the loaded rows. */
  searching?: boolean;
  /** Plural noun for the caveat line, e.g. "notes". */
  noun: string;
}) {
  const { t } = useI18n();

  if (!hasMore) return null;

  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      {searching ? (
        <p className="text-muted-foreground text-center text-xs">
          {t.common.searchingLoaded(loadedCount.toLocaleString(), noun)}
        </p>
      ) : null}
      <Button variant="outline" onClick={loadMore}>
        <ChevronDown />
        {t.common.loadMore(PAGE_SIZE)}
      </Button>
    </div>
  );
}
