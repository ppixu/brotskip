export function allocateSources(nextSource: number, sourceCount: number, added: number, cap: number) {
  const limit = Math.max(added, cap);
  const start = nextSource + added > limit ? 0 : nextSource;
  return {
    start,
    nextSource: (start + added) % limit,
    sourceCount: Math.min(limit, sourceCount + added),
  };
}
