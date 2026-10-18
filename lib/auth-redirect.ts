export function safeAuthNext(value: unknown): string {
  if (typeof value !== "string") return "/launch";
  const path = value.trim();
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !/[\u0000-\u001f\u007f]/.test(path) ? path : "/launch";
}
