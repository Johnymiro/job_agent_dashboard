"use client";

import { OpportunityTable } from "@/components/OpportunityTable";
import { PageHeader } from "@/components/ui";

export default function LeadsPage() {
  return (
    <div>
      <PageHeader
        title="Leads & Projects"
        sub="Agencies that buy white-label senior capacity, freshly funded startups, and people asking for a freelancer — ranked by the odds of a paid engagement over $5k."
      />
      <OpportunityTable kind="lead" />
    </div>
  );
}
