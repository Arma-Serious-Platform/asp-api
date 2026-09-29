export function parseCookieHeader(cookieHeader?: string) {
  if (!cookieHeader) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    cookieHeader.split(';').map((part) => {
      const index = part.indexOf('=');
      if (index === -1) {
        return [part.trim(), ''];
      }

      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();

      return [key, decodeURIComponent(value)];
    }),
  ) as Record<string, string>;
}
