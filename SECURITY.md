# Security Policy

## Overview

DeepLX is a serverless translation API built on Cloudflare Workers that prioritizes security through multiple layers of protection. This document outlines our security practices, vulnerability reporting procedures, and security considerations for users.

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Features

### 🛡️ Built-in Security Measures

#### 1. Input Validation & Sanitization

- **Text Length Limits**: Maximum 5,000 characters per translation request
- **Language Code Validation**: Strict validation of language codes (2-5 characters, alphanumeric and hyphens only)
- **Request Size Limits**: Maximum 32KB request payload
- **Parameter Type Checking**: Strict type validation for all input parameters

#### 2. Rate Limiting & DDoS Protection

- **Multi-layer Rate Limiting**:
  - Per-proxy endpoint: 8 requests/second
  - Global rate limiting with token bucket algorithm
  - Client IP-based rate limiting
- **Circuit Breaker**: Automatic failover when endpoints become unavailable
- **Cloudflare Protection**: Built-in DDoS protection and bot mitigation

#### 3. Security Headers

All responses include comprehensive security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; script-src 'none'; object-src 'none';
```

#### 4. CORS Configuration

- Configurable CORS policies
- Preflight request handling
- Secure cross-origin resource sharing

#### 5. IP Address Validation

- Trusted IP extraction from Cloudflare headers (`CF-Connecting-IP`)
- Fallback to `X-Forwarded-For` with validation
- IPv4 and IPv6 address validation
- Protection against IP spoofing

### 🔒 Data Protection

#### 1. Data Handling

- **No Persistent Storage**: Translation requests are not permanently stored
- **Temporary Caching**: Results cached for performance (configurable TTL)
- **Memory Management**: Automatic cache cleanup every 5 minutes
- **No Logging of Sensitive Data**: Translation content is not logged

#### 2. Privacy Considerations

- **Client IP Handling**: IPs used only for rate limiting, not stored permanently
- **Request Sanitization**: All input parameters are sanitized before processing
- **Error Response Sanitization**: Sensitive information never exposed in error messages

### 🚨 Debug Mode Security

The debug endpoint (`/debug`) includes additional security measures:

- **Production Disabled**: Automatically disabled unless `DEBUG_MODE=true`
- **Limited Information**: Only shows sanitized request structure
- **No Sensitive Data**: Never exposes API keys, tokens, or raw translation content

## Security Best Practices for Users

### 🔧 Deployment Security

#### 1. Environment Configuration

```jsonc
{
  "vars": {
    "DEBUG_MODE": "false",  // Always false in production
    "PROXY_URLS": "https://your-secure-endpoints.com/jsonrpc"
  }
}
```

#### 2. Proxy Endpoint Security

- Use HTTPS-only endpoints
- Regularly rotate proxy endpoints
- Monitor proxy endpoint health
- Implement endpoint-specific rate limiting

#### 3. Access Control

- Restrict API access using Cloudflare Access (if needed)
- Implement custom authentication for sensitive use cases
- Monitor usage patterns for anomalies

### 📊 Monitoring & Logging

#### 1. Security Monitoring

- Monitor rate limit violations
- Track unusual request patterns
- Set up alerts for service degradation
- Regular security audits of proxy endpoints

#### 2. Recommended Logging

```javascript
// Example: Custom logging for security events
if (rateLimitExceeded) {
  console.log(`Rate limit exceeded for IP: ${hashedIP}`);
}
```

## Vulnerability Reporting

### 🚨 Reporting Security Issues

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

#### 1. **DO NOT** create a public GitHub issue

#### 2. Send details to: [i@xi-xu.me](mailto:i@xi-xu.me)

#### 3. Include the following information

```
Subject: [SECURITY] DeepLX Vulnerability Report

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if available)
- Your contact information
```

### 🕐 Response Timeline

- **Initial Response**: Within 48 hours
- **Vulnerability Assessment**: Within 7 days
- **Fix Development**: Within 14 days (depending on severity)
- **Public Disclosure**: After fix deployment (coordinated disclosure)

### 🏆 Recognition

We appreciate security researchers who help improve DeepLX security:

- Public acknowledgment (with permission)
- Credit in release notes
- Priority support for future issues

## Security Considerations

### ⚠️ Known Limitations

#### 1. Third-party Dependencies

- **Proxy Endpoints**: Security depends on proxy endpoint implementations
- **Cloudflare Workers**: Subject to Cloudflare's security model
- **External Translation Services**: Data passes through third-party services

#### 2. Rate Limiting Bypass

- **Distributed Attacks**: Multiple IPs can potentially bypass rate limits
- **Proxy Rotation**: Attackers might use multiple proxy endpoints

#### 3. Cache Poisoning

- **Cache Key Collision**: Theoretical risk of cache key collisions
- **Memory Cache**: In-memory cache vulnerable to memory-based attacks

### 🛠️ Mitigation Strategies

#### 1. Enhanced Rate Limiting

```typescript
// Example: Additional rate limiting layers
const ENHANCED_RATE_LIMITS = {
  PER_IP_PER_MINUTE: 60,
  PER_IP_PER_HOUR: 1000,
  GLOBAL_PER_SECOND: 100
};
```

#### 2. Request Validation

```typescript
// Example: Enhanced input validation
function validateTranslationRequest(params: any): boolean {
  return (
    params.text &&
    typeof params.text === 'string' &&
    params.text.length <= MAX_TEXT_LENGTH &&
    !containsSuspiciousPatterns(params.text)
  );
}
```

## Compliance & Standards

### 📋 Security Standards

- **OWASP Top 10**: Protection against common web vulnerabilities
- **CSP**: Content Security Policy implementation
- **HTTPS Only**: All communications encrypted in transit
- **Input Validation**: Following OWASP input validation guidelines

### 🌍 Privacy Compliance

- **GDPR Considerations**: No personal data storage by default
- **Data Minimization**: Only necessary data processed
- **Right to Erasure**: Cache expiration ensures data removal

## Security Updates

### 📢 Update Notifications

- Security updates announced via GitHub releases
- Critical vulnerabilities communicated via email (if contact provided)
- Security advisories published for high-severity issues

### 🔄 Update Process

1. **Assessment**: Evaluate security impact
2. **Development**: Create and test security fix
3. **Testing**: Comprehensive security testing
4. **Deployment**: Coordinated release deployment
5. **Communication**: Public disclosure after fix deployment

## Additional Resources

### 📚 Security Documentation

- [Cloudflare Workers Security](https://developers.cloudflare.com/workers/platform/security/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

### 🔧 Security Tools

- [Security Headers Checker](https://securityheaders.com/)
- [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)
- [OWASP ZAP](https://owasp.org/www-project-zap/) for security testing

### 📞 Emergency Contact

For critical security issues requiring immediate attention:

- **Email**: [i@xi-xu.me](mailto:i@xi-xu.me)
- **Subject**: `[URGENT SECURITY] DeepLX Critical Vulnerability`

---

## Disclaimer

While we implement comprehensive security measures, users should:

- **Avoid Sensitive Data**: Don't translate confidential or sensitive information
- **Monitor Usage**: Regularly review API usage patterns
- **Keep Updated**: Use the latest version of DeepLX
- **Follow Best Practices**: Implement additional security measures as needed

**Remember**: Security is a shared responsibility. While we provide a secure foundation, proper deployment and usage practices are essential for maintaining security.
