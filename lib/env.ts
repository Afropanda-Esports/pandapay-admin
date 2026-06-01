/**
 * Build-time guard for required server env (used from next.config.ts).
 */
export function assertAdminEnv(): void {
  const apiUrl =
    process.env.API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    throw new Error(
      'pandapay-admin: set API_URL (recommended) or NEXT_PUBLIC_API_URL to the NestJS base URL',
    );
  }
  try {
    new URL(apiUrl);
  } catch {
    throw new Error(`pandapay-admin: invalid API URL "${apiUrl}"`);
  }
}
