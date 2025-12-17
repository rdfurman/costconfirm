/**
 * Input Sanitization
 *
 * Prevents XSS (Cross-Site Scripting) attacks by sanitizing user-generated content.
 *
 * React provides built-in XSS protection by escaping content, but we still need to:
 * 1. Sanitize inputs before storing in database
 * 2. Remove potentially dangerous characters
 * 3. Validate and normalize text content
 */

/**
 * Sanitize plain text input
 * Removes HTML tags and dangerous characters
 *
 * @param text - Raw user input
 * @returns Sanitized text safe for storage and display
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return (
    text
      // Remove any HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove any null bytes
      .replace(/\0/g, "")
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Normalize whitespace
      .trim()
  );
}

/**
 * Sanitize email address
 * Validates and normalizes email format
 *
 * @param email - Raw email input
 * @returns Lowercase, trimmed email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== "string") {
    return "";
  }

  const sanitized = email.toLowerCase().trim();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return "";
  }

  return sanitized;
}

/**
 * Sanitize multiline text (notes, descriptions)
 * Allows newlines but removes dangerous content
 *
 * @param text - Raw multiline text
 * @returns Sanitized text with preserved newlines
 */
export function sanitizeMultilineText(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return (
    text
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove script tags and content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove null bytes
      .replace(/\0/g, "")
      // Remove control characters except newlines, carriage returns, and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Normalize multiple newlines to max 2
      .replace(/\n{3,}/g, "\n\n")
      // Trim
      .trim()
  );
}

/**
 * Sanitize filename
 * Removes path traversal attempts and dangerous characters
 *
 * @param filename - Raw filename input
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") {
    return "";
  }

  return (
    filename
      // Remove path separators
      .replace(/[/\\]/g, "")
      // Remove null bytes
      .replace(/\0/g, "")
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, "")
      // Remove potentially dangerous characters
      .replace(/[<>:"|?*]/g, "")
      // Limit to reasonable length
      .slice(0, 255)
      .trim()
  );
}

/**
 * Sanitize URL
 * Ensures URL is safe and uses allowed protocols
 *
 * @param url - Raw URL input
 * @param allowedProtocols - Allowed URL protocols (default: http, https)
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ["http:", "https:"]
): string {
  if (!url || typeof url !== "string") {
    return "";
  }

  try {
    const parsed = new URL(url.trim());

    // Check if protocol is allowed
    if (!allowedProtocols.includes(parsed.protocol)) {
      return "";
    }

    return parsed.toString();
  } catch {
    // Invalid URL
    return "";
  }
}

/**
 * Sanitize object with multiple fields
 * Applies appropriate sanitization to each field
 *
 * @param data - Object with user input
 * @param schema - Sanitization schema defining how to sanitize each field
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(
  data: T,
  schema: {
    [K in keyof T]?: "text" | "email" | "multiline" | "filename" | "url";
  }
): T {
  const sanitized = { ...data };

  for (const key in schema) {
    const sanitizationType = schema[key];
    const value = data[key];

    if (value === undefined || value === null) {
      continue;
    }

    switch (sanitizationType) {
      case "text":
        sanitized[key] = sanitizeText(String(value)) as T[typeof key];
        break;
      case "email":
        sanitized[key] = sanitizeEmail(String(value)) as T[typeof key];
        break;
      case "multiline":
        sanitized[key] = sanitizeMultilineText(String(value)) as T[typeof key];
        break;
      case "filename":
        sanitized[key] = sanitizeFilename(String(value)) as T[typeof key];
        break;
      case "url":
        sanitized[key] = sanitizeUrl(String(value)) as T[typeof key];
        break;
    }
  }

  return sanitized;
}

/**
 * Escape HTML special characters
 * For cases where you need to display user content as HTML
 *
 * @param text - Raw text
 * @returns HTML-escaped text
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  const htmlEscapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Sanitize SQL-like input
 * Removes potential SQL injection patterns
 * Note: Prisma already protects against SQL injection, but this adds defense-in-depth
 *
 * @param text - Raw text that might be used in queries
 * @returns Sanitized text
 */
export function sanitizeSqlInput(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return (
    text
      // Remove SQL comments
      .replace(/--.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Remove semicolons (query terminators)
      .replace(/;/g, "")
      // Trim
      .trim()
  );
}
