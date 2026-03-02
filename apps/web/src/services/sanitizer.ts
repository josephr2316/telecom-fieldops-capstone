/**
 * sanitizer.ts
 * Sanitización anti-XSS para campos de texto que se renderizan en la UI.
 * RNF-SEC-02: Obligatorio en todos los campos de texto visibles.
 */

/**
 * Escapa caracteres HTML peligrosos en un string.
 * Úsalo en cualquier valor que venga del servidor y se muestre en el DOM.
 */
export function sanitizeText(value: string): string {
  return value
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitiza todos los campos string de un objeto.
 * Útil para sanitizar entidades completas que llegan de la API.
 *
 * @example
 * const clean = sanitizeObject(plan, ['name', 'description']);
 */
export function sanitizeObject<T extends object>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    const val = result[field];
    if (typeof val === 'string') {
      (result as any)[field] = sanitizeText(val);
    }
  }
  return result;
}
