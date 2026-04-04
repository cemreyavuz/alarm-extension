const pad = (n: number) => String(n).padStart(2, "0");

export const toDatetimeLocalValue = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
