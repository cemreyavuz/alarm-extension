export const formatWhen = (ms: number): string =>
  new Date(ms).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
