import { PrepTestPage } from "@/components/prep/Simulator";
import { PREP_TESTS } from "@/lib/prep";

// Static export: one HTML page per registered test.
export const dynamicParams = false;
export function generateStaticParams() {
  return PREP_TESTS.map((t) => ({ slug: t.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PrepTestPage slug={slug} />;
}
