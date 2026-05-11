type JwtPayload = {
  sub: string;
  features?: string[];
  tenantId?: string;
  roles?: string[];
  isMasterUser?: boolean;
  sessionId?: string;
  exp?: number;
};

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export function extractFeatures(token: string): string[] {
  return decodeJwt(token)?.features ?? [];
}

export function extractTenantId(token: string): string | null {
  return decodeJwt(token)?.tenantId ?? null;
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export function msUntilExpiry(token: string): number {
  const payload = decodeJwt(token);
  if (!payload?.exp) return 0;
  return payload.exp * 1000 - Date.now();
}
