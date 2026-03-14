import type { TagFilter } from '@/types/document';

/** Determine whether an entity should be visible given its tags and the current filter state. */
export function isVisible(tags: string[] | undefined, filter: TagFilter): boolean {
  if (!tags || tags.length === 0) return true;
  if (!filter.scenario) return false;

  const entityScenarios = tags.filter((t) => !t.startsWith('flow:') && !t.startsWith('type:'));
  const entitySources = tags.filter((t) => t.startsWith('flow:')).map((t) => t.slice(5));
  const entityTypes = tags.filter((t) => t.startsWith('type:')).map((t) => t.slice(5));

  if (entityScenarios.length > 0 && !entityScenarios.includes(filter.scenario)) return false;
  if (entitySources.length > 0 && !entitySources.some((s) => filter.sources.has(s))) return false;
  if (entityTypes.length > 0 && !entityTypes.some((t) => filter.types.has(t))) return false;

  return true;
}
