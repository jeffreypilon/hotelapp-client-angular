import { Injectable } from '@angular/core';

/**
 * The permitted alternative to a raw console.log, per coding-standards.md#forbidden and
 * logging-observability.md. debug/info are suppressed in a production build; warn/error always
 * reach the console.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

// Recursive: the payment block arrives nested under `payment`, so a shallow redact would miss it.
const REDACT = new Set([
  'cardNumber',
  'cvv',
  'expiryMonth',
  'expiryYear',
  'password',
  'currentPassword',
  'newPassword',
]);

function redact(value: unknown): unknown {
  if (value instanceof Error) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, REDACT.has(key) ? '[REDACTED]' : redact(v)]),
    );
  }
  return value;
}

@Injectable({ providedIn: 'root' })
export class Logger {
  private write(level: Level, msg: string, ctx?: object): void {
    if ((level === 'debug' || level === 'info') && !isDevMode()) return;
    const payload = ctx ? redact(ctx) : undefined;
    console[level](`[${level}] ${msg}`, payload ?? '');
  }

  debug(msg: string, ctx?: object): void {
    this.write('debug', msg, ctx);
  }

  info(msg: string, ctx?: object): void {
    this.write('info', msg, ctx);
  }

  warn(msg: string, ctx?: object): void {
    this.write('warn', msg, ctx);
  }

  error(msg: string, err?: unknown, ctx?: object): void {
    console.error(`[error] ${msg}`, err ?? '', ctx ? redact(ctx) : '');
  }
}

/** `ngDevMode` is Angular's own dev/prod flag, set false by a production build. */
declare const ngDevMode: boolean | undefined;
function isDevMode(): boolean {
  return typeof ngDevMode === 'undefined' || !!ngDevMode;
}
