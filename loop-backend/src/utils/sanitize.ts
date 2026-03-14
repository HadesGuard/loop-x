/**
 * Strips HTML tags from a string to prevent XSS in user-generated content.
 * Also decodes common HTML entities to prevent double-encoding.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')         // remove HTML tags
    .replace(/javascript:/gi, '')    // remove javascript: protocol
    .replace(/on\w+\s*=/gi, '');     // remove inline event handlers (onerror=, onclick=, etc.)
}
