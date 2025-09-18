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
- **Search & Filter**: Search through test categories and filter attempts by vulnerability status
- **Detailed Response Analysis**: View full prompts, responses, and detector scores for each attempt
- **🔐 OIDC Authentication**: Secure access with OpenID Connect integration supporting automated service discovery for various providers (Okta, Google, Azure AD, Auth0, Keycloak, AWS Cognito, and more)

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

   Configure the required environment variables in your `.env` file:
   ```bash
   # Directory where Garak report files are stored
   REPORT_DIR=./data
   
   # Set to false to disabled authentication
   OIDC_ENABLED=true

   # OIDC Authentication (Optional)
   OIDC_ISSUER=https://your-oidc-provider.com
   OIDC_CLIENT_ID=your-client-id
   OIDC_CLIENT_SECRET=your-client-secret
   OIDC_PROVIDER_NAME=Your Provider Name
   
   # NextAuth Configuration (Required if OIDC_ENABLED=true)
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   ```

   **Path handling:**
   - **Relative paths** (like `./data`, `../reports`) are resolved from the project root
   - **Absolute paths** (starting with `/`) are used as-is
   
   **OIDC Configuration:**
   - See [OIDC_SETUP.md](OIDC_SETUP.md) for detailed configuration instructions
   - Supports automated service discovery for various providers

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

### OIDC Authentication (Optional)

#### Disable Auth Entirely
- **`OIDC_ENABLED`**: Turns authentication on or off (true/false)

#### Required Variables for OIDC
- **`OIDC_ISSUER`**: OIDC provider issuer URL (e.g., `https://your-provider.com`)
- **`OIDC_CLIENT_ID`**: OAuth client ID from your provider
- **`OIDC_CLIENT_SECRET`**: OAuth client secret from your provider

#### Optional Variables for OIDC
- **`OIDC_PROVIDER_NAME`**: Display name for the provider (default: "OIDC Provider")
- **`OIDC_SCOPES`**: Requested scopes (default: `openid,profile,email`)
- **`OIDC_USE_PKCE`**: Enable PKCE for security (default: `true`)
- **`OIDC_MAX_AGE`**: Session max age in seconds (default: `3600`)

#### NextAuth Variables (Required if OIDC_ENABLED=true)
- **`NEXTAUTH_URL`**: Application URL (e.g., `http://localhost:3000`)
- **`NEXTAUTH_SECRET`**: Secret for JWT signing (generate a strong random string)

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
