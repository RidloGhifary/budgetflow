"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pageSizeOptions = [10, 20, 50];

export function useClientPagination<T>(items: T[], resetKeys: unknown[] = [], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetKeys);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize;

    return items.slice(startIndex, startIndex + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    pageSize,
    paginatedItems,
    setPage,
    setPageSize: (nextPageSize: number) => {
      setPageSize(nextPageSize);
      setPage(1);
    },
    totalItems,
    totalPages
  };
}

interface PaginationControlsProps {
  className?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function PaginationControls({
  className,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  totalItems,
  totalPages
}: PaginationControlsProps) {
  if (totalItems === 0) {
    return null;
  }

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);
  const pageNumbers = getVisiblePages(page, totalPages);

  return (
    <div className={cn("flex flex-col gap-3 border-t border-border pt-4 text-sm md:flex-row md:items-center md:justify-between", className)}>
      <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
        <span>
          Showing {startItem}-{endItem} of {totalItems}
        </span>
        <label className="flex items-center gap-2">
          <span>Rows</span>
          <select
            className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pageSize}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button aria-label="First page" disabled={page === 1} onClick={() => onPageChange(1)} size="icon" type="button" variant="outline">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button aria-label="Previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)} size="icon" type="button" variant="outline">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pageNumbers.map((pageNumber) => (
          <Button
            key={pageNumber}
            aria-label={`Page ${pageNumber}`}
            onClick={() => onPageChange(pageNumber)}
            size="sm"
            type="button"
            variant={pageNumber === page ? "default" : "outline"}
          >
            {pageNumber}
          </Button>
        ))}
        <Button aria-label="Next page" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} size="icon" type="button" variant="outline">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button aria-label="Last page" disabled={page === totalPages} onClick={() => onPageChange(totalPages)} size="icon" type="button" variant="outline">
          <ChevronsRight className="h-4 w-4" />
        </Button>
        <span className="ml-2 text-muted-foreground">Page {page} of {totalPages}</span>
      </div>
    </div>
  );
}

function getVisiblePages(page: number, totalPages: number) {
  const firstPage = Math.max(1, page - 1);
  const lastPage = Math.min(totalPages, firstPage + 2);
  const adjustedFirstPage = Math.max(1, lastPage - 2);

  return Array.from({ length: lastPage - adjustedFirstPage + 1 }, (_, index) => adjustedFirstPage + index);
}
