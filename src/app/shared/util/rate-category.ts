import type { RateCategoryOption } from '../../core/api/types';

/**
 * Rate-category labels always come from GET /rate-categories, never the raw enum value -- per
 * phased-implementation-plan.md's Angular Step 3 entry, this is the one shared lookup every later
 * screen rendering a `rateCategory` (S4, S6, S7, S8c) must call, to avoid the drift React's project
 * had to fix as a defect after shipping this correctly only in its own Step 3.
 */
export function rateCategoryLabel(options: RateCategoryOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
