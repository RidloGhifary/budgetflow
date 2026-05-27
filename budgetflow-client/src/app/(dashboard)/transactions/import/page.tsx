"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TransactionImportPanel } from "@/components/data-imports/transaction-import-panel";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";

export default function TransactionImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Transactions"
        description="Validate CSV rows, preview issues, and process imports in the background before they affect your balances."
        actions={
          <Link className={buttonVariants({ variant: "outline" })} href="/transactions">
            <ArrowLeft className="h-4 w-4" />
            Transactions
          </Link>
        }
      />
      <TransactionImportPanel />
    </div>
  );
}

