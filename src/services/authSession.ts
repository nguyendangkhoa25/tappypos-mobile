type LogoutReason = 'session_expired' | 'device_switched' | 'user_initiated';

type ForceLogoutHandler = (reason: LogoutReason) => Promise<void>;

let handler: ForceLogoutHandler | null = null;

export function registerForceLogout(fn: ForceLogoutHandler) {
  handler = fn;
}

export async function forceLogout(reason: LogoutReason = 'session_expired') {
  if (handler) await handler(reason);
}
