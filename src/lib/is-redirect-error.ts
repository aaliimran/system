/**
 * Server Actions called directly (not via <form action>) surface Next.js's
 * internal redirect() as a rejected promise carrying a NEXT_REDIRECT digest.
 * Client code that wraps such a call in try/catch must rethrow this instead
 * of treating it as a real error, or the redirect breaks and the digest
 * leaks into the UI as error text.
 */
export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
