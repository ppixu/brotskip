export function allocateSources(nextSource: number, sourceCount: number, added: number, cap: number) {
  const limit = Math.max(added, cap);
  const start = nextSource + added > limit ? 0 : nextSource;
  return {
    start,
    nextSource: (start + added) % limit,
    sourceCount: Math.min(limit, sourceCount + added),
  };
}

export function allocateSourcesAppend(sourceCount: number, added: number, cap: number) {
  const room = Math.max(0, cap - sourceCount);
  const count = Math.min(added, room);
  return {
    start: sourceCount,
    nextSource: sourceCount + count,
    sourceCount: sourceCount + count,
    added: count,
  };
}
