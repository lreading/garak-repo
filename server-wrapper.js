#!/usr/bin/env node

// Server wrapper to inject runtime environment variables
// This ensures variables set at Docker runtime are available to Next.js

// Read runtime config and set as environment variables
const fs = require('fs');
const path = require('path');

try {
  const configPath = '/tmp/.runtime-config.json';
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  // Set all config values as environment variables
  Object.keys(config).forEach(key => {
    if (config[key]) {
      process.env[key] = config[key];
    }
  });
  
  console.log('Runtime config loaded: OIDC_ENABLED=' + process.env.OIDC_ENABLED);
} catch (err) {
  console.log('No runtime config found, using build-time environment');
}

// Start the Next.js server
require('./server.js');

