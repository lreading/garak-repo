#!/bin/sh

# Startup script for Garak Repository Docker container
echo "Starting Garak Repository..."

# Set default REPORT_DIR if not provided
if [ -z "$REPORT_DIR" ]; then
    REPORT_DIR="./data"
    echo "REPORT_DIR not set, using default: $REPORT_DIR"
    export REPORT_DIR
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

# List contents of REPORT_DIR for debugging
echo "Report directory contents:"
ls -la "$REPORT_DIR" || echo "Failed to list directory contents"

# Check for .jsonl files
jsonl_count=$(find "$REPORT_DIR" -name "*.jsonl" -type f 2>/dev/null | wc -l)
echo "Found $jsonl_count .jsonl files in report directory"

if [ "$jsonl_count" -eq 0 ]; then
    echo "WARNING: No .jsonl files found in report directory"
    echo "The application will start but may not show any reports"
fi

echo "Starting Next.js application..."
echo "You can check the health endpoint at: http://localhost:3000/api/health"
exec npm start
