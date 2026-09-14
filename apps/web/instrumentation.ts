/** Development-də Mock API-ni avtomatik qaldırır — Node.js hissəsi ayrıca faylda (Edge runtime üçün). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
