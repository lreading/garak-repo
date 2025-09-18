# OIDC Authentication Setup Guide

This guide explains how to configure OIDC (OpenID Connect) authentication for the Garak Report Dashboard with automated service discovery support for various providers.

## Overview

The application now includes a generic OIDC integration that supports automated service discovery, making it compatible with various OIDC providers including:

- **Okta**
- **Google**
- **Azure AD**
- **Auth0**
- **Keycloak**
- **AWS Cognito**
- And any other OIDC-compliant provider

## Features

- ✅ **Automated Service Discovery**: Automatically discovers provider endpoints from the issuer URL
- ✅ **Generic Configuration**: Works with any OIDC-compliant provider
- ✅ **Security Best Practices**: Implements PKCE, nonce, and state parameters
- ✅ **Token Management**: Automatic token refresh and session management
- ✅ **User Information**: Displays user profile, groups, and roles
- ✅ **Secure Middleware**: Protects all routes with authentication

## Quick Setup

### 1. Install Dependencies


```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your OIDC provider:

```bash
cp example.env .env
```

### 3. Configure OIDC Provider

Edit `.env` with your OIDC provider details:

```env
# Required Configuration
OIDC_ISSUER=https://your-oidc-provider.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_PROVIDER_NAME=Your Provider Name

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

### 4. Start the Application

```bash
npm run dev
```

## Provider-Specific Configuration

### Okta

```env
OIDC_ISSUER=https://your-domain.okta.com
OIDC_CLIENT_ID=your-okta-client-id
OIDC_CLIENT_SECRET=your-okta-client-secret
OIDC_PROVIDER_NAME=Okta
OIDC_SCOPES=openid,profile,email,groups
```

### Google

```env
OIDC_ISSUER=https://accounts.google.com
OIDC_CLIENT_ID=your-google-client-id
OIDC_CLIENT_SECRET=your-google-client-secret
OIDC_PROVIDER_NAME=Google
OIDC_SCOPES=openid,profile,email
```

### Azure AD

```env
OIDC_ISSUER=https://login.microsoftonline.com/your-tenant-id/v2.0
OIDC_CLIENT_ID=your-azure-client-id
OIDC_CLIENT_SECRET=your-azure-client-secret
OIDC_PROVIDER_NAME=Azure AD
OIDC_SCOPES=openid,profile,email
```

### Auth0

```env
OIDC_ISSUER=https://your-domain.auth0.com
OIDC_CLIENT_ID=your-auth0-client-id
OIDC_CLIENT_SECRET=your-auth0-client-secret
OIDC_PROVIDER_NAME=Auth0
OIDC_SCOPES=openid,profile,email
```

### Keycloak

```env
OIDC_ISSUER=https://your-keycloak.com/realms/your-realm
OIDC_CLIENT_ID=your-keycloak-client-id
OIDC_CLIENT_SECRET=your-keycloak-client-secret
OIDC_PROVIDER_NAME=Keycloak
OIDC_SCOPES=openid,profile,email
```

### AWS Cognito

```env
OIDC_ISSUER=https://cognito-idp.region.amazonaws.com/user-pool-id
OIDC_CLIENT_ID=your-cognito-client-id
OIDC_CLIENT_SECRET=your-cognito-client-secret
OIDC_PROVIDER_NAME=AWS Cognito
OIDC_SCOPES=openid,profile,email
```

## Configuration Options

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OIDC_ISSUER` | OIDC provider issuer URL | `https://your-provider.com` |
| `OIDC_CLIENT_ID` | OAuth client ID | `your-client-id` |
| `OIDC_CLIENT_SECRET` | OAuth client secret | `your-client-secret` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `OIDC_PROVIDER_NAME` | Display name for provider | `OIDC Provider` | `Okta` |
| `OIDC_SCOPES` | Requested scopes (comma-separated) | `openid,profile,email` | `openid,profile,email,groups` |
| `OIDC_USE_PKCE` | Enable PKCE for security | `true` | `true` |
| `OIDC_USE_NONCE` | Enable nonce parameter | `true` | `true` |
| `OIDC_USE_STATE` | Enable state parameter | `true` | `true` |
| `OIDC_MAX_AGE` | Session max age in seconds | `3600` | `7200` |

### NextAuth Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for JWT signing | `your-secret-key` |

## How It Works

### 1. Service Discovery

The application automatically discovers OIDC provider endpoints by fetching the `.well-known/openid_configuration` document from the issuer URL. This eliminates the need to manually configure endpoints.

### 2. Authentication Flow

1. User clicks "Sign In"
2. Application redirects to OIDC provider's authorization endpoint
3. User authenticates with the provider
4. Provider redirects back with authorization code
5. Application exchanges code for tokens
6. User information is retrieved and session is established

### 3. Session Management

- JWT tokens are used for session management
- Access tokens are automatically refreshed when needed
- User information is cached in the session

### 4. Route Protection

All routes except public ones (sign-in, error pages) are protected by authentication middleware. Unauthenticated users are redirected to the sign-in page.

## Security Features

- **PKCE (Proof Key for Code Exchange)**: Prevents authorization code interception
- **Nonce Parameter**: Prevents replay attacks
- **State Parameter**: Prevents CSRF attacks
- **Secure Token Storage**: Tokens are stored securely in HTTP-only cookies
- **Automatic Token Refresh**: Prevents session expiration
- **Secure Logout**: Properly terminates sessions

## Troubleshooting

### Common Issues

1. **"Configuration Error"**
   - Check that all required environment variables are set
   - Verify the issuer URL is correct and accessible

2. **"Access Denied"**
   - Check user permissions in your OIDC provider
   - Verify the client is configured correctly

3. **"Verification Error"**
   - Check that the client secret is correct
   - Verify the redirect URI is configured in your provider

### Debug Mode

Enable debug mode by setting:

```env
OIDC_DEBUG=true
```

This will provide detailed logging for troubleshooting.

### Provider-Specific Issues

#### Okta
- Ensure the application is configured as a "Web Application"
- Set the redirect URI to `{NEXTAUTH_URL}/api/auth/callback/oidc`
- Enable "Refresh Token" in the application settings

#### Google
- Use the "Web application" client type
- Add the redirect URI to authorized redirect URIs
- Ensure the OAuth consent screen is configured

#### Azure AD
- Register the application in Azure AD
- Configure API permissions
- Set the redirect URI in authentication settings

## Production Deployment

### Environment Variables

Ensure all required environment variables are set in your production environment:

```env
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret
OIDC_ISSUER=https://your-production-provider.com
OIDC_CLIENT_ID=your-production-client-id
OIDC_CLIENT_SECRET=your-production-client-secret
```

### Security Considerations

- Use strong, unique secrets for `NEXTAUTH_SECRET`
- Ensure HTTPS is enabled in production
- Regularly rotate client secrets
- Monitor authentication logs for suspicious activity
