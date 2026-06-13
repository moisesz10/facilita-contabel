# Security Documentation

## Reporting Security Issues
If you discover a security vulnerability, please email **security@facilita-contabil.com** with a detailed description. Include steps to reproduce and any relevant logs/code snippets. We will acknowledge receipt within 48 hours and work with you to resolve the issue.

## Critical Environment Variables
- **JWT_SECRET** – secret for signing JWTs. Must be kept confidential.
- **CORS_ORIGINS** – allowed origins for CORS.
- **COOKIE_SECRET** – secret for signed cookies (if used).
- **CONTADOR_PASSWORD_HASH** – bcrypt hash for contador password.

## Security Practices Implemented
- Helmet with CSP and referrer‑policy.
- CSRF protection via `csurf`.
- Rate limiting (global 60 req/min, login‑specific 5 attempts per 15 min).
- Input validation with `express-validator`.
- Secure file upload (whitelisted extensions, UUID filenames, 700 permissions).
- `app.disable('x-powered-by')`.
- Cookie flags `HttpOnly`, `Secure`, `SameSite=Strict` when used.

## Recommended Future Actions
- Rotate JWT secret regularly.
- Enable audit logging for critical actions.
- Periodic dependency scanning (npm audit, Snyk).
