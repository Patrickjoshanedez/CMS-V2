# Frontend Mythos: Client-Side Security & XSS Prevention Spec

## 1. Cross-Site Scripting (XSS) Defenses

### Context-Aware HTML Sanitization
Never insert raw, user-controlled strings into the DOM via `dangerouslySetInnerHTML`, `v-html`, or `element.innerHTML`. When rich text rendering is required (e.g. Markdown previews, user comments), pass content through `DOMPurify` with an explicit attribute and tag allowlist:

```typescript
import DOMPurify from 'dompurify';

const SANITIZE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li',
    'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'span'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'title'],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeHtml(dirtyHtml: string): string {
  // Purify and automatically enforce noopener noreferrer on links
  return DOMPurify.sanitize(dirtyHtml, {
    ...SANITIZE_CONFIG,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}
```

---

## 2. Safe Hyperlink & External Navigation Defense

### Reverse Tabnabbing Prevention
Any anchor opening in a new tab (`target="_blank"`) creates a security vulnerability where the target window can access the opener via `window.opener.location`, enabling malicious redirects.

* **Mandatory Rule**: Every `target="_blank"` must include `rel="noopener noreferrer"`.
* **Safe Link Helper Component**:

```tsx
import { AnchorHTMLAttributes } from 'react';

export function SafeExternalLink({
  href,
  children,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  // 1. Validate URL protocol scheme
  const isSafeProtocol = /^https?:\/\//i.test(href || '');
  if (!isSafeProtocol) {
    console.warn(`[Security Warning] Blocked unsafe external link scheme: ${href}`);
    return <span className={className}>{children}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...props}
    >
      {children}
    </a>
  );
}
```

### URL Protocol Allowlisting
User-submitted URLs (profile websites, repository links, image URLs) must be validated before binding to `href` or `src`:
* **Allowed Schemes**: `http:`, `https:`, `mailto:`, `tel:`
* **Strictly Blocked Schemes**: `javascript:`, `data:text/html`, `vbscript:`, `blob:` (unless generated in-session)

```typescript
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

---

## 3. Client Secret & Token Hygiene

### Zero Secrets in Frontend Bundles
* Any environment variable exposed through Vite (`VITE_*`) or Next.js (`NEXT_PUBLIC_*`) is bundled in plaintext inside client JavaScript files.
* **Strict Blacklist**: Never place database passwords, Stripe secret keys, JWT signing secrets, or private API keys in client-accessible environment files.
* If a third-party service requires a secret key, proxy requests through a dedicated backend API route (`/api/proxy/...`).

### Token Storage Strategy
| Storage Type | XSS Vulnerability | CSRF Vulnerability | Mythos Recommendation |
| :--- | :--- | :--- | :--- |
| **`localStorage`** | ❌ **High**: Any XSS payload can steal the token via `localStorage.getItem()`. | ✅ Immune | Avoid for primary authentication tokens. |
| **`sessionStorage`** | ❌ **High**: Vulnerable to XSS within the same browser tab session. | ✅ Immune | Avoid for long-lived credentials. |
| **In-Memory (JS Closure / Store)** | ✅ **Safe**: Not accessible via simple storage dump. | ✅ Immune | Recommended for short-lived access tokens. |
| **`HttpOnly` Cookie** | ✅ **Safe**: JavaScript cannot read the cookie; immune to XSS token exfiltration. | ⚠️ Requires CSRF defense (SameSite=Lax/Strict) | **Best Practice** for enterprise authentication. |

---

## 4. Content Security Policy (CSP) Directives

A robust Content Security Policy headers configuration halts unauthorized script execution even if an injection vector occurs:

```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'nonce-rAnd0m123';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.yourdomain.com wss://api.yourdomain.com;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
```

* **`frame-ancestors 'none'`**: Completely prevents UI clickjacking attacks by blocking the application from being embedded inside external `<iframe>` elements.
* **`object-src 'none'`**: Disables legacy browser plugins (Flash, Java Applets).

---

## 5. Prototype Pollution Defense

When cloning objects or deeply merging client state (e.g. form presets, theme customization payloads):
* Never use unsafe recursive merge functions that traverse `__proto__`, `constructor`, or `prototype`.
* Use `Object.assign()`, modern spread operators (`...`), or `structuredClone()`.

```typescript
export function safeDeepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  
  for (const key of Object.keys(source)) {
    // Block prototype pollution keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    
    const sourceVal = source[key as keyof T];
    if (sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
      output[key as keyof T] = safeDeepMerge(output[key as keyof T] || {}, sourceVal);
    } else if (sourceVal !== undefined) {
      output[key as keyof T] = sourceVal as any;
    }
  }
  
  return output;
}
```
