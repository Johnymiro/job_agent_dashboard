import type { PrepTest } from "./types";
import { bnpParibas } from "./tests/bnp-paribas";

/** Every test-prep pack, newest first. To add one: write lib/prep/tests/<slug>.ts
 *  exporting a `PrepTest`, then list it here — /prep and /prep/<slug> pick it up. */
export const PREP_TESTS: PrepTest[] = [bnpParibas];

export const getPrepTest = (slug: string) => PREP_TESTS.find((t) => t.slug === slug) ?? null;

export type * from "./types";
