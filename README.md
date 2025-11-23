# Garak Report Repository

> **⚠️ Version Notice:** This project is currently in version 0.x and is subject to breaking changes without notice. When we reach v1.0, we will follow [Semantic Versioning](https://semver.org/) and will not introduce breaking changes without a major version bump.

A comprehensive repository and analysis tool for storing, organizing, and analyzing [Garak](https://github.com/NVIDIA/garak) security testing reports. This application serves as both a storage repository for your Garak runs and an advanced dashboard for drilling down into specific attempts and responses to understand exact failures and identify false positives.

## Features

- **Report Repository**: Store and organize your Garak security testing reports in a centralized location
- **Web-based Upload**: Upload new reports directly through the web interface
- **Folder Organization**: Organize reports in folders with hierarchical browsing
- **Advanced Analytics**: View comprehensive statistics including vulnerability rates, test categories, and overall security posture
- **Drill-down Analysis**: Examine individual test attempts and responses to understand specific failures
- **False Positive Detection**: Analyze detector results and responses to identify potential false positives
- **🔧 Configurable Report Editing**: Toggle vulnerability scores to mark false positives/negatives (can be disabled for read-only environments)
- **Search & Filter**: Search through test categories and filter attempts by vulnerability status
- **Detailed Response Analysis**: View full prompts, responses, and detector scores for each attempt
- **🔐 OIDC Authentication**: Secure access with OpenID Connect integration supporting automated service discovery for various providers (Okta, Google, Azure AD, Auth0, Keycloak, AWS Cognito, and more)
- **🔑 Shared Secret Authentication**: Machine-to-machine API authentication using configurable shared secrets for automated services and CI/CD pipelines

## 🌐 Demo Instance

Try out the Garak Report Repository with our live demo instance:

**[https://garak-repo.leoreading.dev/](https://garak-repo.leoreading.dev/)**

The demo instance is in **read-only mode** - you can browse and analyze existing reports but cannot upload new reports or modify vulnerability scores. This gives you a chance to explore the interface and see how the tool works with real Garak security testing data.

*Note: The demo runs on recycled hardware (15-20 year old servers) in a home lab environment. Report loading may take up to 30 seconds - please be patient!*

> **Help Wanted!** We're looking for contributors to share complete Garak reports (JSONL format) from popular base models to expand our demo collection. If you have full reports with all probes enabled, please check out [this GitHub issue](https://github.com/lreading/garak-repo/issues/21) to learn how you can contribute!

## Screenshots

### Report Selection Interface
The main interface allows you to browse and select from your stored Garak reports, with folder organization and search capabilities.

![Report Selection Interface](screenshots/report-selection.png)

### Detailed Analysis Dashboard
Once you select a report, you can view comprehensive statistics and drill down into specific vulnerability categories to examine individual attempts and responses.

![Analysis Dashboard](screenshots/analysis-dashboard.png)

### Attempts View
View the attempts and responses that happened during the testing.  Filter by vulnerability status and determine if there are any false positives.

![Attempts View](screenshots/attempts.png)


## Getting Started

### Running with Docker (Recommended)

The easiest way to get started is using the pre-built Docker image:

1. **Pull the latest image:**
   ```bash
   docker pull nerdyhick/garak-repo:latest
   ```

2. **Run the container:**
   ```bash
   docker run -p 3000:3000 -e "OIDC_ENABLED=false" -v /path/to/your/reports:/app/data nerdyhick/garak-repo:latest
   ```

   Replace `/path/to/your/reports` with the actual path to your Garak report files.
   In production, it is strongly recommended to configure an OIDC provider via your IDP.

   **Note:** The container defaults to using `/app/data` as the report directory (mapped from `REPORT_DIR=./data`).  You can change this by adding `-e REPORT_DIR=<some-directory-in-the-container>`

3. **Run in detached mode (background):**
   ```bash
   docker run -d -p 3000:3000 \
     -v /path/to/your/reports:/app/data \
     -e "OIDC_ENABLED=false" \
     --name garak-repo \
     nerdyhick/garak-repo:latest
   ```

4. **Using a specific version:**
   ```bash
   docker run -p 3000:3000 \
     -v /path/to/your/reports:/app/data \
     -e "OIDC_ENABLED=false" \
     nerdyhick/garak-repo:0.0.1
   ```

5. **Stop the container:**
   ```bash
   docker stop garak-repo
   ```

6. **View container logs:**
   ```bash
   docker logs garak-repo
   ```

The Docker container will:
- Serve the application on port 3000
- Mount your report directory to `/app/data` inside the container
- Automatically detect and serve your Garak report files
- Run in standalone mode for optimal performance

### Running Locally (Development)

For development or if you prefer to run the application locally:

1. **Prerequisites:**
   - Node.js 18 or later
   - npm or yarn

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   
   Copy the example environment file:
   ```bash
   cp example.env .env
   ```

   Configure the environment variables in your `.env` file. The application has smart defaults to make getting started easier:

   **Quick Start (No Authentication):**
   ```bash
   # Minimal configuration for local development without authentication
   OIDC_ENABLED=false
   # That's it! REPORT_DIR, NEXTAUTH_URL, and NEXTAUTH_SECRET will auto-default
   ```

   **Full Configuration:**
   ```bash
   # Directory where Garak report files are stored
   # Default: ./data (auto-created if OIDC_ENABLED=false)
   REPORT_DIR=./data
   
   # Enable/disable OIDC authentication
   # Set to 'false' for no authentication, 'true' for OIDC
   OIDC_ENABLED=true

   # NextAuth Configuration
   # REQUIRED when OIDC_ENABLED=true (app will exit with error if missing)
   # OPTIONAL when OIDC_ENABLED=false (auto-defaults applied)
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   
   # OIDC Provider Configuration
   # REQUIRED when OIDC_ENABLED=true (app will exit with error if missing)
   OIDC_ISSUER=https://your-oidc-provider.com
   OIDC_CLIENT_ID=your-client-id
   OIDC_CLIENT_SECRET=your-client-secret
   OIDC_PROVIDER_NAME=Your Provider Name
   
   # Shared Secret Authentication (Optional - for machine-to-machine API access)
   SHARED_SECRET=your-shared-secret-here
   ```

   **Environment Variable Defaults:**
   - `REPORT_DIR`: Defaults to `./data` if not set
   - `NEXTAUTH_URL`: Defaults to `http://localhost:3000` when `OIDC_ENABLED=false`
   - `NEXTAUTH_SECRET`: Auto-generated (secure random) when `OIDC_ENABLED=false`
   
   **Path Handling:**
   - **Relative paths** (like `./data`, `../reports`) are resolved from the project root
   - **Absolute paths** (starting with `/`) are used as-is
   - All paths are validated for security
   
   **OIDC Configuration:**
   - See [OIDC_SETUP.md](OIDC_SETUP.md) for detailed configuration instructions
   - Supports automated service discovery for various providers
   - When `OIDC_ENABLED=true`, the application validates all required variables on startup
   - Missing required variables will cause the app to exit with a clear error message

   **⚠️ Important Notes:**
   - When changing `OIDC_ENABLED`, you must restart the development server
   - Next.js does not automatically reload environment variables on hot reload
   - If OIDC variables are missing when `OIDC_ENABLED=true`, the app will not start

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

6. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

The following environment variables can be configured:

### Report Storage

#### `REPORT_DIR` (Optional)
- **Description**: Directory where Garak report files are stored
- **Default**: `./data`
- **Examples**: 
  - `REPORT_DIR=./data` (relative to project root)
  - `REPORT_DIR=/var/log/garak/reports` (absolute path)
- **Path handling**: 
  - Relative paths are resolved from the project root
  - Absolute paths (starting with `/`) are used as-is

#### `REPORT_READONLY` (Optional)
- **Description**: Controls whether the repository is in read-only mode
- **Default**: `false`
- **Values**: 
  - `true`: Read-only mode - disables all state-changing operations (report uploads, vulnerability score editing, upload UI hidden). To add reports in this mode, manually copy `.jsonl` files to the `REPORT_DIR` directory on the filesystem.
  - `false`: Full access mode - users can upload reports and edit vulnerability scores through the web interface
- **Use cases**: 
  - Set to `true` for production environments where report integrity must be preserved
  - Set to `false` for analysis environments where analysts need to mark false positives

### OIDC Authentication (Optional)

#### Enable/Disable Authentication
- **`OIDC_ENABLED`**: Turns authentication on or off
  - `true`: Requires OIDC authentication (default)
  - `false`: Disables authentication entirely

#### Required Variables (when OIDC_ENABLED=true)
**OIDC Provider Configuration:**
- **`OIDC_ISSUER`**: OIDC provider issuer URL (e.g., `https://your-provider.com`)
- **`OIDC_CLIENT_ID`**: OAuth client ID from your provider
- **`OIDC_CLIENT_SECRET`**: OAuth client secret from your provider

**NextAuth Configuration:**
- **`NEXTAUTH_URL`**: Application URL (e.g., `http://localhost:3000`)
  - Auto-defaults to `http://localhost:3000` when `OIDC_ENABLED=false`
- **`NEXTAUTH_SECRET`**: Secret for JWT signing (generate a strong random string)
  - Auto-generated (secure random) when `OIDC_ENABLED=false`

**Note**: When `OIDC_ENABLED=true`, all five variables above are required. If any are missing, the application will exit with a clear error message listing the missing variables.

#### Optional Variables for OIDC
- **`OIDC_PROVIDER_NAME`**: Display name for the provider (default: "OIDC Provider")
- **`OIDC_SCOPES`**: Requested scopes (default: `openid,profile,email`)
- **`OIDC_USE_PKCE`**: Enable PKCE for security (default: `true`)
- **`OIDC_MAX_AGE`**: Session max age in seconds (default: `3600`)
- **`OIDC_DEBUG`**: Enable debug logging for troubleshooting (default: `false`)

### Shared Secret Authentication (Optional)

#### `SHARED_SECRET` (Optional)
- **Description**: Shared secret for machine-to-machine API authentication
- **Default**: Not set (authentication disabled)
- **Usage**: When set, enables API access using shared secret authentication
- **Authentication Method**: `X-API-Key: <shared-secret>` (case-insensitive header name)
- **Fallback**: If not set or empty, falls back to OIDC authentication or no authentication (depending on `OIDC_ENABLED`)

### Cache Configuration (Optional)

#### `CACHE_MAX_MEMORY_MB` (Optional)
- **Description**: Maximum memory limit for the in-memory LRU cache in megabytes
- **Default**: `100` (100MB)
- **Purpose**: The cache stores report metadata to significantly improve performance when loading reports. Loading report metadata can be CPU-intensive for large files (~300MB), taking up to 15 seconds depending on hardware. The cache reduces this to near-instant responses for cached reports.
- **How it works**:
  - Report metadata is cached after the first load
  - Cache is automatically invalidated when vulnerability scores are modified
  - Uses LRU (Least Recently Used) eviction when memory limit is reached
  - Each cached metadata entry is approximately 7KB
- **Examples**:
  - `CACHE_MAX_MEMORY_MB=100` - Default, suitable for most deployments (~14,000 cached reports)
  - `CACHE_MAX_MEMORY_MB=200` - For high-traffic deployments (~28,000 cached reports)
  - `CACHE_MAX_MEMORY_MB=50` - For memory-constrained environments (~7,000 cached reports)
- **Note**: The cache implementation uses an abstraction layer, making it easy to swap in Redis or other centralized caching solutions in the future.

For detailed OIDC configuration instructions and provider-specific examples, see [OIDC_SETUP.md](OIDC_SETUP.md).

## Usage

### Storing Reports

1. **Upload via Web Interface**: Use the upload button to add new Garak report files (`.jsonl` format) directly through the web interface
2. **File System**: Place your Garak report files in the directory specified by `REPORT_DIR` - the application will automatically detect and list them
3. **Folder Organization**: Organize reports in subdirectories for better management of multiple test runs

### Analyzing Reports

1. **Browse Reports**: The dashboard automatically detects and lists all available reports with metadata including run ID, model name, and test statistics
2. **Select a Report**: Click on any report to view comprehensive analysis including:
   - Overall vulnerability statistics and test category breakdown
   - Individual test category performance with vulnerability rates
   - DEFCON grades and Z-scores for each category

### Drill-down Analysis

The key benefit of this repository is the ability to drill down into specific attempts and responses:

1. **Category Analysis**: Click on any test category to view detailed attempt-level data
2. **Filter Attempts**: Filter attempts by vulnerability status (All, Vulnerable, Safe) to focus on specific issues
3. **Examine Individual Attempts**: View complete details for each attempt including:
   - Full prompt text and test goals
   - All model responses with vulnerability scoring
   - Detector results with individual scores for each response
   - Response analysis showing which specific responses triggered vulnerabilities

4. **Identify False Positives**: By examining the full context of prompts and responses, you can:
   - Understand why certain responses were flagged as vulnerable
   - Identify cases where detectors may have produced false positives
   - Analyze the quality and appropriateness of model responses
   - Make informed decisions about security posture

This detailed analysis capability helps you understand not just that vulnerabilities were found, but exactly what went wrong and whether the detections are accurate.

### API Usage with Shared Secret Authentication

When `SHARED_SECRET` is configured, you can access the API endpoints programmatically for machine-to-machine communication:

#### Uploading Reports via API

```bash
# Using X-API-Key header (case-insensitive)
curl -X POST http://localhost:3000/api/upload-report \
  -H "X-API-Key: your-shared-secret-here" \
  -F "file=@your-report.jsonl"

# Alternative case variations (all work the same)
curl -X POST http://localhost:3000/api/upload-report \
  -H "x-api-key: your-shared-secret-here" \
  -F "file=@your-report.jsonl"

curl -X POST http://localhost:3000/api/upload-report \
  -H "X-Api-Key: your-shared-secret-here" \
  -F "file=@your-report.jsonl"
```

#### Listing Reports via API

```bash
# Get list of all reports
curl -H "X-API-Key: your-shared-secret-here" \
  http://localhost:3000/api/reports

# Get specific report content
curl -H "X-API-Key: your-shared-secret-here" \
  "http://localhost:3000/api/garak-report?filename=your-report.jsonl"
```

#### Available API Endpoints

- `POST /api/upload-report` - Upload new Garak report files
- `GET /api/reports` - List all available reports
- `GET /api/garak-report` - Get specific report content
- `GET /api/garak-report-metadata` - Get report metadata
- `GET /api/garak-report-attempts` - Get report attempts data
- `GET /api/folders` - List folder structure

**Note**: All API endpoints support shared secret authentication when `SHARED_SECRET` is configured. The `X-API-Key` header name is case-insensitive (e.g., `X-API-Key`, `x-api-key`, `X-Api-Key` all work). If shared secret authentication is not configured, the API will fall back to OIDC authentication or no authentication (depending on your `OIDC_ENABLED` setting).

## Troubleshooting

### Application Won't Start

#### Error: "OIDC is enabled but required environment variables are missing"

**Cause**: You have `OIDC_ENABLED=true` but some required variables are not set.

**Solution**: The error message will list which variables are missing. You need to either:

1. **Set all required variables** (when using OIDC):
   ```bash
   OIDC_ENABLED=true
   OIDC_ISSUER=https://your-provider.com
   OIDC_CLIENT_ID=your-client-id
   OIDC_CLIENT_SECRET=your-client-secret
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   ```

2. **Disable OIDC** (for local development without authentication):
   ```bash
   OIDC_ENABLED=false
   ```

#### Report Directory Error

**Error**: "Report directory does not exist"

**Cause**: The `REPORT_DIR` path doesn't exist or isn't accessible.

**Solution**:
```bash
# Create the directory
mkdir -p ./data

# Or specify an existing directory in .env
REPORT_DIR=/path/to/existing/directory
```

**Note**: If `REPORT_DIR` is not set, it defaults to `./data` and will be created automatically.

### Authentication Issues

#### Too Many Redirects

**Cause**: This usually happens when OIDC is enabled but environment variables are incomplete or incorrect.

**Solution**: 
1. Check that all required OIDC variables are set correctly
2. Verify your OIDC provider configuration (client ID, secret, redirect URIs)
3. Ensure `NEXTAUTH_URL` matches your application's URL
4. For troubleshooting, try setting `OIDC_DEBUG=true` to see detailed logs
5. As a last resort, temporarily disable OIDC: `OIDC_ENABLED=false`

#### Session/Cookie Issues

**Problem**: Can't stay logged in or session expires immediately.

**Solution**:
1. Ensure `NEXTAUTH_SECRET` is set to a strong, random value (at least 32 characters)
2. Verify `NEXTAUTH_URL` matches the URL you're accessing the app from
3. In production, ensure you're using HTTPS
4. Check that cookies are enabled in your browser

### Docker Issues

#### Port Already in Use

**Error**: "Port 3000 is already in use"

**Solution**:
```bash
# Stop the existing container
docker stop garak-repo

# Or use a different port
docker run -p 8080:3000 ...
```

#### Volume Mount Issues

**Error**: "Permission denied" when mounting report directory

**Solution**:
```bash
# Ensure the host directory has proper permissions
chmod 755 /path/to/reports

# Or run with appropriate user permissions
docker run --user $(id -u):$(id -g) ...
```

### Development Server Issues

#### Changes Not Reflecting

**Problem**: Code or environment variable changes don't take effect.

**Solution**:
1. **Environment variables**: Always restart the dev server after changing `.env`
   ```bash
   # Stop the server (Ctrl+C) then restart
   npm run dev
   ```

2. **Code changes**: Clear Next.js cache if hot reload isn't working:
   ```bash
   rm -rf .next
   npm run dev
   ```

#### Build Errors After Updates

**Problem**: Errors after pulling new code or updating dependencies.

**Solution**:
```bash
# Clean install
rm -rf node_modules .next
npm install
npm run dev
```

### Getting Help

If you continue to experience issues:

1. **Check the logs**: Look for error messages in the console output
2. **Verify configuration**: Compare your `.env` with `example.env`
3. **Enable debug mode**: Set `OIDC_DEBUG=true` for OIDC issues
4. **Check documentation**: See [OIDC_SETUP.md](OIDC_SETUP.md) for detailed OIDC configuration
5. **Report issues**: Open an issue on GitHub with:
   - Error messages (sanitize sensitive data)
   - Your configuration (without secrets)
   - Steps to reproduce
