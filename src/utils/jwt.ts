type JwtPayload = {
  sub: string;
  features?: string[];
  tenantId?: string;
  roles?: string[];
  isMasterUser?: boolean;
  sessionId?: string;
  shopType?: string;
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

export function extractUserId(token: string): string | null {
  return decodeJwt(token)?.sub ?? null;
}

export function extractShopType(token: string): string | null {
  return decodeJwt(token)?.shopType ?? null;
}

export function extractTenantId(token: string): string | null {
  const payload = decodeJwt(token) as any;
  if (!payload) return null;
  if (typeof payload.tenantId === 'string') return payload.tenantId;
  // Backend uses 'tid' claim as a single-element array; filter out 'master' (registration placeholder)
  if (Array.isArray(payload.tid) && payload.tid.length > 0 && payload.tid[0] !== 'master') {
    return payload.tid[0] as string;
  }
  return null;
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
