# Security Documentation

This document outlines the security measures implemented in the Habit Tracker application.

## Authentication & Authorization

### JWT Tokens
- **Access Tokens**: Short-lived (15 minutes), stored in httpOnly cookies
- **Refresh Tokens**: Long-lived (7 days), stored in httpOnly cookies
- **Token Rotation**: Refresh tokens are rotated on each use
- **Secure Cookies**: Cookies are marked as `httpOnly`, `secure` (in production), and `sameSite: strict` (in production)

### Password Security
- **Hashing**: Passwords are hashed using bcrypt with 12 rounds
- **Password Policy**: 
  - Minimum 8 characters
  - Must contain uppercase, lowercase, and number
  - Maximum 100 characters
- **Account Lockout**: Accounts are locked after 5 failed login attempts for 15 minutes

## Rate Limiting

### General API
- **Limit**: 100 requests per 15 minutes per IP
- **Window**: 15 minutes

### Authentication Endpoints
- **Limit**: 5 requests per 15 minutes per IP
- **Skip Successful**: Successful requests don't count toward limit

### Sensitive Operations
- **Limit**: 3 requests per hour per IP
- **Applies to**: Data export, account deletion

## Input Validation & Sanitization

### Server-Side
- **Zod Schemas**: All inputs validated with Zod schemas
- **XSS Protection**: User inputs are sanitized to remove dangerous characters
- **UUID Validation**: All UUID parameters are validated before use
- **Type Checking**: Strict TypeScript types prevent type confusion

### Client-Side
- **React**: Built-in XSS protection via JSX escaping
- **Input Validation**: Client-side validation before submission

## Security Headers

Implemented via Helmet.js:
- **Content-Security-Policy**: Restricts resource loading
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Additional XSS protection
- **Strict-Transport-Security**: Enforces HTTPS (production)
- **Referrer-Policy**: Controls referrer information

## Database Security

### Prisma ORM
- **Parameterized Queries**: All queries use parameterized statements (prevents SQL injection)
- **Connection Pooling**: Efficient connection management
- **Type Safety**: TypeScript types prevent SQL injection

### Data Access
- **User Isolation**: All queries filter by `userId` to ensure data isolation
- **Authorization Checks**: Ownership verified before any data modification

## Error Handling

### Information Disclosure Prevention
- **Production**: Generic error messages (no stack traces)
- **Development**: Detailed error messages for debugging
- **Request IDs**: Each request has a unique ID for tracing

## Audit Logging

All security-relevant actions are logged:
- User registration
- Login/logout
- Account deletion
- Data export
- Habit/task creation/modification/deletion

Logs include:
- User ID
- Action type
- IP address
- Timestamp
- Entity information

## CORS Configuration

- **Allowed Origins**: Configured via `CLIENT_URL` environment variable
- **Credentials**: Enabled for cookie-based authentication
- **Methods**: Limited to necessary HTTP methods
- **Headers**: Restricted to required headers

## Environment Variables

### Required
- `JWT_SECRET`: Must be at least 32 characters, unique per environment
- `DATABASE_URL`: PostgreSQL connection string

### Security Best Practices
- Never commit `.env` files
- Use different secrets for development and production
- Rotate secrets periodically
- Use strong, random secrets (generate with `openssl rand -base64 32`)

## Trust Proxy

When behind a reverse proxy (nginx, load balancer):
- Set `TRUST_PROXY=true` in environment
- Ensures accurate IP addresses for rate limiting
- Required for proper CORS and security headers

## Session Management

- **Session Storage**: Refresh tokens stored in database
- **Session Expiry**: Automatic cleanup of expired sessions
- **Session Rotation**: Sessions rotated on privilege changes
- **Multi-Device**: Users can have multiple active sessions

## Security Checklist

- [x] Strong password hashing (bcrypt, 12 rounds)
- [x] JWT token security (httpOnly cookies, short expiration)
- [x] Rate limiting on all endpoints
- [x] Account lockout protection
- [x] Input validation and sanitization
- [x] XSS protection
- [x] SQL injection prevention (Prisma ORM)
- [x] CORS configuration
- [x] Security headers (Helmet)
- [x] Error handling (no information disclosure)
- [x] Audit logging
- [x] UUID validation
- [x] Request ID tracing
- [x] Environment variable validation

## Reporting Security Issues

If you discover a security vulnerability, please:
1. Do NOT create a public issue
2. Email the maintainers directly
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## Updates

This security documentation is updated as new security measures are implemented. Last updated: 2024
