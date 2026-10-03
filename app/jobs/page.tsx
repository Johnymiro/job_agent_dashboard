"use client";

import { OpportunityTable } from "@/components/OpportunityTable";
import { PageHeader } from "@/components/ui";

export default function JobsPage() {
  return (
    <div>
      <PageHeader
        title="Jobs"
        sub="Senior roles from Google Jobs (incl. LinkedIn listings), remote boards, HN and company career pages — scored against your profile."
      />
      <OpportunityTable kind="job" />
    </div>
  );
}
