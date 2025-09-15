# Nexus Security Implementation Guide

This comprehensive guide documents the security enhancements implemented in the Nexus platform, providing deployment instructions, monitoring guidance, and operational procedures.

## Table of Contents

1. [Overview](#overview)
2. [Security Features](#security-features)
3. [Deployment Guide](#deployment-guide)
4. [Configuration](#configuration)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Incident Response](#incident-response)
7. [Maintenance](#maintenance)
8. [Testing](#testing)

## Overview

The Nexus platform implements enterprise-grade security measures following defense-in-depth principles:

- **Network Layer**: Security headers, CSP, CORS policies
- **Application Layer**: Rate limiting, input validation, authentication
- **Data Layer**: Encryption, database security, RLS policies
- **Operational Layer**: Monitoring, alerting, automated incident response

### Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External Traffic                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Security Headers & CSP                       │
│              (XSS, Clickjacking Protection)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Rate Limiting & DDoS Protection                │
│                 (Redis-based, Distributed)                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│            Input Validation & Sanitization                  │
│           (Zod schemas, XSS/Injection prevention)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│        Authentication & Authorization (Supabase RLS)        │
│              Organization-scoped data access                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Data Layer Security                          │
│    (AES-GCM encryption, Database RLS, Audit logging)       │
└─────────────────────────────────────────────────────────────┘
```

## Security Features

### 1. Redis-Based Rate Limiting

**Production-grade distributed rate limiting with automatic failover:**

- **Implementation**: `apps/web/src/lib/rate-limit-redis.ts`
- **Features**:
  - Sliding window algorithm for accurate rate limiting
  - Redis clustering support for high availability
  - Automatic fallback to in-memory storage
  - Per-user and per-IP rate limiting
  - Configurable limits per endpoint type

**Configuration Example:**
```typescript
// Environment Variables
REDIS_URL=redis://redis-cluster:6379
ENABLE_REDIS_RATE_LIMIT=true

// Application Configuration
const rateLimits = {
  AUTH_SIGN_IN: { limit: 5, windowMs: 5 * 60 * 1000 },
  PLAID_EXCHANGE: { limit: 5, windowMs: 60 * 1000 },
  API_DEFAULT: { limit: 100, windowMs: 60 * 1000 },
};
```

### 2. Comprehensive Input Validation

**Multi-layered input validation and sanitization:**

- **Implementation**: `apps/web/src/lib/validation-enhanced.ts`
- **Features**:
  - Zod-based schema validation
  - Automatic XSS prevention
  - SQL injection protection
  - File upload security
  - Request size limits

**Usage Example:**
```typescript
import { validateRequestBody, validationSchemas } from '@/lib/validation-enhanced';

// Validate transaction correction
const result = await validateRequestBody(
  request,
  validationSchemas.transaction.correct
);

if (!result.success) {
  return createValidationErrorResponse(result.error);
}
```

### 3. Advanced Webhook Security

**Multi-provider webhook verification with signature validation:**

- **Implementation**: `apps/web/src/lib/webhook-security.ts`
- **Features**:
  - HMAC-SHA256 signature verification
  - Timestamp validation
  - IP whitelisting support
  - Provider auto-detection
  - Fail-closed security model

**Security Configuration:**
```typescript
const webhookConfig = {
  enableSignatureVerification: true,
  enableTimestampValidation: true,
  timestampToleranceMs: 5 * 60 * 1000,
  secrets: {
    plaid: process.env.PLAID_WEBHOOK_SECRET,
    stripe: process.env.STRIPE_WEBHOOK_SECRET,
  },
};
```

### 4. Secrets Management

**Enterprise-grade secret management with rotation support:**

- **Implementation**: `packages/shared/src/secrets-manager.ts`
- **Features**:
  - AWS Secrets Manager integration
  - HashiCorp Vault support
  - Environment variable fallback
  - Automatic validation
  - Rotation scheduling

**Provider Configuration:**
```typescript
// AWS Secrets Manager (Production)
AWS_REGION=us-east-1

// HashiCorp Vault (On-premises)
VAULT_URL=https://vault.company.com
VAULT_TOKEN=hvs.CAESIJlWh...

// Environment Variables (Development)
ENCRYPTION_KEY=your-32-character-encryption-key
PLAID_WEBHOOK_SECRET=webhook-secret-from-plaid
```

### 5. Security Monitoring & Alerting

**Real-time threat detection and automated incident response:**

- **Implementation**: `apps/web/src/lib/security-monitoring.ts`
- **Features**:
  - Real-time threat detection
  - Automated alert correlation
  - Slack/email notifications
  - Security metrics dashboard
  - Incident response automation

**Threat Detection Rules:**
```typescript
const threatRules = [
  {
    name: 'Authentication Brute Force',
    conditions: [
      { field: 'clientIP', operator: 'in_range', value: 5, timeWindow: 300 }
    ],
    severity: 'high'
  },
  {
    name: 'SQL Injection Attempt',
    conditions: [
      { field: 'payload', operator: 'regex', value: '(union|select|drop)' }
    ],
    severity: 'critical'
  }
];
```

## Deployment Guide

### Prerequisites

1. **Redis Cluster** (for production rate limiting)
2. **Secret Management Service** (AWS Secrets Manager or Vault)
3. **Monitoring Infrastructure** (Datadog, Splunk, or similar)
4. **Alerting Channels** (Slack, PagerDuty, email)

### Environment Setup

1. **Production Environment Variables:**
```bash
# Core Security
ENCRYPTION_KEY=your-strong-32-plus-character-key
REDIS_URL=redis://redis-cluster:6379
ENABLE_REDIS_RATE_LIMIT=true

# Webhook Security
PLAID_WEBHOOK_SECRET=webhook-secret-from-plaid-dashboard
STRIPE_WEBHOOK_SECRET=whsec_stripe-webhook-secret
SQUARE_WEBHOOK_SECRET=square-webhook-secret

# Secret Management
AWS_REGION=us-east-1
# OR
VAULT_URL=https://vault.company.com
VAULT_TOKEN=hvs.CAESIJlWh...

# Monitoring & Alerting
SLACK_SECURITY_WEBHOOK_URL=https://hooks.slack.com/services/...
DATADOG_API_KEY=your-datadog-api-key
SENTRY_DSN=https://sentry.io/dsn/...
```

2. **Database Migration:**
```bash
# Apply security hardening migration
pnpm run migrate

# Verify RLS policies
psql -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE rowsecurity = true;"
```

3. **Security Headers Verification:**
```bash
# Test security headers
curl -I https://your-domain.com

# Expected headers:
# Content-Security-Policy: default-src 'self'...
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Referrer-Policy: strict-origin-when-cross-origin
```

### Docker Deployment

```dockerfile
# Security-hardened Dockerfile
FROM node:20-alpine AS base

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Security: Install security updates
RUN apk upgrade --no-cache

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY --chown=nextjs:nodejs . .

# Security: Run as non-root
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000
CMD ["npm", "start"]
```

## Configuration

### Rate Limiting Configuration

```typescript
// Production configuration
export const RATE_LIMITS = {
  // Strict limits for authentication
  AUTH_SIGN_IN: { limit: 5, windowMs: 5 * 60 * 1000 },
  AUTH_SIGN_UP: { limit: 3, windowMs: 10 * 60 * 1000 },
  PASSWORD_RESET: { limit: 3, windowMs: 15 * 60 * 1000 },

  // Moderate limits for financial operations
  PLAID_EXCHANGE: { limit: 5, windowMs: 60 * 1000 },
  TRANSACTION_CORRECTION: { limit: 50, windowMs: 60 * 1000 },
  BULK_OPERATIONS: { limit: 10, windowMs: 60 * 1000 },

  // General API limits
  API_DEFAULT: { limit: 100, windowMs: 60 * 1000 },
};
```

### Security Headers Configuration

```typescript
// next.config.ts security headers
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "connect-src 'self' https://*.supabase.co https://us.i.posthog.com",
      "script-src 'self' https://cdn.plaid.com 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "frame-src https://cdn.plaid.com",
    ].join('; ')
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];
```

### Input Validation Schemas

```typescript
// Example validation schema
export const transactionSchemas = {
  correct: z.object({
    transactionId: validators.uuid,
    categoryId: validators.categoryId,
    description: validators.safeText.optional(),
    createRule: z.boolean().default(false),
  }),

  bulkCorrect: z.object({
    transactionIds: z.array(validators.uuid).min(1).max(100),
    categoryId: validators.categoryId,
    createRule: z.boolean().default(false),
  }),
};
```

## Monitoring & Alerting

### Security Metrics Dashboard

The platform provides comprehensive security metrics:

```typescript
// Key security metrics
interface SecurityMetrics {
  eventsLast24h: number;        // Total security events
  alertsOpen: number;           // Open security alerts
  criticalAlerts: number;       // Critical severity alerts
  topEventTypes: Array<{        // Most common event types
    type: string;
    count: number;
  }>;
}
```

### Alert Configuration

```typescript
// Slack integration
const slackConfig = {
  webhookUrl: process.env.SLACK_SECURITY_WEBHOOK_URL,
  channel: '#security-alerts',
  severityColors: {
    critical: '#FF0000',
    high: '#FF8C00',
    medium: '#FFD700',
    low: '#32CD32',
  },
};

// Email alerting
const emailConfig = {
  provider: 'sendgrid',
  apiKey: process.env.SENDGRID_API_KEY,
  recipients: ['security@company.com'],
  templates: {
    critical: 'security-critical-alert',
    high: 'security-high-alert',
  },
};
```

### Automated Responses

```typescript
// Automated incident response
const automatedResponses = {
  // Auto-block IPs with excessive failed auth attempts
  authBruteForce: {
    threshold: 5,
    timeWindow: 300, // 5 minutes
    action: 'blockIP',
    duration: 3600,  // 1 hour
  },

  // Auto-escalate critical alerts
  criticalAlert: {
    escalationDelay: 300, // 5 minutes
    onCallService: 'pagerduty',
    notificationChannels: ['slack', 'email', 'sms'],
  },
};
```

## Incident Response

### Security Incident Playbooks

#### 1. Authentication Brute Force Attack

**Detection:** Multiple failed login attempts from single IP
**Response:**
1. Automatic IP blocking (temporary)
2. Alert security team via Slack
3. Analyze attack patterns
4. Implement permanent blocks if needed
5. Review and strengthen authentication policies

#### 2. SQL Injection Attempt

**Detection:** Malicious SQL patterns in input
**Response:**
1. Immediate request blocking
2. Critical alert to security team
3. Review and patch vulnerable endpoints
4. Audit recent database activities
5. Update input validation rules

#### 3. Webhook Verification Failure

**Detection:** Invalid webhook signatures
**Response:**
1. Block suspicious webhook sources
2. Verify webhook endpoint configurations
3. Rotate webhook secrets if compromised
4. Review recent webhook activities
5. Update partner organizations if needed

### Escalation Matrix

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| Low | 24 hours | Security team review |
| Medium | 4 hours | Security team investigation |
| High | 1 hour | Security team + on-call engineer |
| Critical | 15 minutes | All hands + management notification |

## Maintenance

### Daily Operations

1. **Security Metrics Review**
   ```bash
   # Check security dashboard
   curl -H "Authorization: Bearer $API_TOKEN" \
     https://api.company.com/security/metrics
   ```

2. **Dependency Audit**
   ```bash
   # Run vulnerability scan
   pnpm run security:audit
   pnpm run security:outdated
   ```

3. **Log Analysis**
   ```bash
   # Review security events
   grep "SECURITY_EVENT" /var/log/nexus/app.log | tail -100
   ```

### Weekly Operations

1. **Threat Detection Rule Review**
   - Analyze false positive rates
   - Adjust detection thresholds
   - Add new threat patterns

2. **Access Review**
   - Review user permissions
   - Audit organization memberships
   - Remove inactive accounts

3. **Secret Rotation**
   ```bash
   # Rotate encryption keys
   aws secretsmanager rotate-secret --secret-id nexus/encryption-key

   # Update webhook secrets
   aws secretsmanager update-secret --secret-id nexus/plaid-webhook \
     --secret-string "new-webhook-secret"
   ```

### Monthly Operations

1. **Penetration Testing**
   - External security assessment
   - Vulnerability remediation
   - Security posture review

2. **Security Training**
   - Team security awareness
   - Incident response drills
   - Security policy updates

3. **Compliance Review**
   - SOC 2 compliance check
   - PCI DSS assessment
   - Data privacy audit

## Testing

### Security Test Suite

```bash
# Run all security tests
pnpm run test:security

# Individual test suites
pnpm run test:rate-limit      # Rate limiting tests
pnpm run test:validation      # Input validation tests
pnpm run test:api-security    # API security tests
pnpm run test:webhook         # Webhook security tests
```

### Manual Security Testing

1. **Rate Limiting Test**
   ```bash
   # Test API rate limits
   for i in {1..25}; do
     curl -X POST https://api.company.com/api/plaid/link-token \
       -H "Authorization: Bearer $TOKEN"
   done
   ```

2. **Input Validation Test**
   ```bash
   # Test XSS protection
   curl -X POST https://api.company.com/api/transactions/correct \
     -H "Content-Type: application/json" \
     -d '{"description": "<script>alert(\"xss\")</script>"}'
   ```

3. **Webhook Security Test**
   ```bash
   # Test webhook verification
   curl -X POST https://api.company.com/api/plaid/webhook \
     -H "plaid-verification: invalid-signature" \
     -d '{"webhook_type": "TRANSACTIONS"}'
   ```

### Load Testing

```bash
# Security-focused load test
npx artillery run security-load-test.yml

# Rate limiting stress test
npx artillery run rate-limit-stress-test.yml
```

### Example Artillery Configuration

```yaml
# security-load-test.yml
config:
  target: 'https://api.company.com'
  phases:
    - duration: 300
      arrivalRate: 10
  processor: './security-test-processor.js'

scenarios:
  - name: "Authentication stress test"
    weight: 50
    flow:
      - post:
          url: "/api/auth/sign-in"
          json:
            email: "{{ $randomEmail() }}"
            password: "wrong-password"

  - name: "Rate limiting test"
    weight: 50
    flow:
      - loop:
        - post:
            url: "/api/plaid/link-token"
            headers:
              Authorization: "Bearer {{ authToken }}"
        count: 30
```

## Security Checklist

### Pre-Deployment

- [ ] All security tests passing
- [ ] Rate limiting configured and tested
- [ ] Input validation schemas updated
- [ ] Webhook secrets configured
- [ ] Security headers enabled
- [ ] Database RLS policies active
- [ ] Monitoring alerts configured
- [ ] Incident response procedures documented

### Post-Deployment

- [ ] Security metrics collecting
- [ ] Alerts functioning correctly
- [ ] Rate limiting working as expected
- [ ] No security regression issues
- [ ] Documentation updated
- [ ] Team notified of changes
- [ ] Security review completed
- [ ] Compliance requirements met

---

## Support & Contact

For security questions or incident reporting:

- **Security Team**: security@company.com
- **Emergency**: +1-555-SECURITY
- **Documentation**: https://docs.company.com/security
- **Status Page**: https://status.company.com

**Last Updated**: December 2024
**Version**: 2.0
**Classification**: Internal Use Only