#!/bin/sh

# Startup script for Garak Repository Docker container
echo "Starting Garak Repository..."

# Set default REPORT_DIR if not provided
if [ -z "$REPORT_DIR" ]; then
    REPORT_DIR="./data"
    echo "REPORT_DIR not set, using default: $REPORT_DIR"
    export REPORT_DIR
fi

# Handle OIDC and NextAuth configuration
OIDC_ENABLED="${OIDC_ENABLED:-true}"

if [ "$OIDC_ENABLED" = "false" ]; then
    # OIDC disabled - set defaults for NextAuth if not provided
    if [ -z "$NEXTAUTH_URL" ]; then
        export NEXTAUTH_URL="http://localhost:3000"
        echo "OIDC disabled: Using default NEXTAUTH_URL: http://localhost:3000"
    fi
    
    if [ -z "$NEXTAUTH_SECRET" ]; then
        # Generate a random secret (using /dev/urandom)
        export NEXTAUTH_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '\n/')
        echo "OIDC disabled: Generated random NEXTAUTH_SECRET for session management"
    fi
else
    # OIDC enabled - validate required environment variables
    MISSING_VARS=""
    
    [ -z "$OIDC_ISSUER" ] && MISSING_VARS="$MISSING_VARS OIDC_ISSUER"
    [ -z "$OIDC_CLIENT_ID" ] && MISSING_VARS="$MISSING_VARS OIDC_CLIENT_ID"
    [ -z "$OIDC_CLIENT_SECRET" ] && MISSING_VARS="$MISSING_VARS OIDC_CLIENT_SECRET"
    [ -z "$NEXTAUTH_URL" ] && MISSING_VARS="$MISSING_VARS NEXTAUTH_URL"
    [ -z "$NEXTAUTH_SECRET" ] && MISSING_VARS="$MISSING_VARS NEXTAUTH_SECRET"
    
    if [ -n "$MISSING_VARS" ]; then
        echo ""
        echo "❌ ERROR: OIDC is enabled but required environment variables are missing:"
        echo ""
        for var in $MISSING_VARS; do
            echo "   - $var"
        done
        echo ""
        echo "Please set these environment variables when running the container."
        echo "See example.env for configuration examples."
        echo ""
        echo "To disable OIDC authentication, set: OIDC_ENABLED=false"
        echo ""
        exit 1
    fi
    
    echo "✓ OIDC enabled: All required environment variables are set"
fi

# Check if REPORT_DIR exists and is accessible
if [ ! -d "$REPORT_DIR" ]; then
    echo "ERROR: Report directory '$REPORT_DIR' does not exist!"
    echo "Please ensure you mount your reports directory to $REPORT_DIR"
    echo "Example: docker run -v /path/to/your/reports:$REPORT_DIR ..."
    exit 1
fi

# Check if REPORT_DIR is readable
if [ ! -r "$REPORT_DIR" ]; then
    echo "ERROR: Report directory '$REPORT_DIR' is not readable!"
    echo "Please check the permissions of your mounted directory"
    exit 1
fi

# Create runtime config file for Next.js to read
# Use /tmp since nextjs user can't write to /app
# This works around standalone build limitations where process.env is baked in
cat > /tmp/.runtime-config.json <<EOF
{
  "OIDC_ENABLED": "$OIDC_ENABLED",
  "REPORT_DIR": "$REPORT_DIR",
  "NEXTAUTH_URL": "${NEXTAUTH_URL:-}",
  "NEXTAUTH_SECRET": "${NEXTAUTH_SECRET:-}",
  "OIDC_ISSUER": "${OIDC_ISSUER:-}",
  "OIDC_CLIENT_ID": "${OIDC_CLIENT_ID:-}",
  "OIDC_CLIENT_SECRET": "${OIDC_CLIENT_SECRET:-}"
}
EOF

# Export all variables so they're available to Next.js
export OIDC_ENABLED
export REPORT_DIR
export NEXTAUTH_URL
export NEXTAUTH_SECRET
export OIDC_ISSUER
export OIDC_CLIENT_ID
export OIDC_CLIENT_SECRET

echo "Starting Next.js application..."
echo "You can check the health endpoint at: http://localhost:3000/api/health"
exec node server-wrapper.js
