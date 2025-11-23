import swaggerJSDoc from 'swagger-jsdoc';
import { glob } from 'glob';
import path from 'path';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Garak Repo API',
      version: '1.0.0',
      description: 'API for managing and analyzing Garak security reports and repository data',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Shared secret authentication (case-insensitive header name)',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'OIDC/NextAuth JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp',
            },
          },
        },
        Report: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'Report filename',
            },
            path: {
              type: 'string',
              description: 'Full path to report file',
            },
            size: {
              type: 'number',
              description: 'File size in bytes',
            },
            modified: {
              type: 'string',
              format: 'date-time',
              description: 'Last modified timestamp',
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok'],
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            version: {
              type: 'string',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Reports',
        description: 'Garak report management endpoints',
      },
      {
        name: 'Authentication',
        description: 'Authentication and configuration endpoints',
      },
      {
        name: 'System',
        description: 'System health and configuration endpoints',
      },
    ],
  },
  apis: [], // Will be populated dynamically
};

/**
 * Automatically discover API route files
 */
async function discoverApiRoutes(): Promise<string[]> {
  try {
    const apiDir = path.join(process.cwd(), 'src/app/api');
    const routeFiles = await glob('**/route.ts', { 
      cwd: apiDir,
      absolute: true,
    });
    
    console.log(`[Swagger] Discovered ${routeFiles.length} API routes:`, routeFiles.map(f => path.relative(apiDir, f)));
    return routeFiles;
  } catch (error) {
    console.warn('[Swagger] Failed to discover API routes:', error);
    return [];
  }
}

/**
 * Generate OpenAPI specification with automatic route discovery
 */
export async function generateSwaggerSpec() {
  try {
    // Discover API routes dynamically
    const apiRoutes = await discoverApiRoutes();
    
    // Update options with discovered routes
    const dynamicOptions = {
      ...options,
      apis: apiRoutes,
    };
    
    const spec = swaggerJSDoc(dynamicOptions);
    
    // Add runtime info
    // @ts-expect-error - swaggerJSDoc returns object but TypeScript doesn't know about info property
    spec.info.generatedAt = new Date().toISOString();
    // @ts-expect-error - swaggerJSDoc returns object but TypeScript doesn't know about info property
    spec.info['x-discovered-routes'] = apiRoutes.length;
    
    return spec;
  } catch (error) {
    console.error('[Swagger] Failed to generate spec:', error);
    
    // Fallback spec
    return {
      ...(options.definition || {}),
      info: {
        ...(options.definition?.info || {}),
        description: 'API documentation (auto-discovery failed)',
        generatedAt: new Date().toISOString(),
      },
      paths: {},
    };
  }
}

/**
 * Get cached or generate fresh swagger spec
 */
let cachedSpec: object | null = null;
let lastGenerated = 0;
const CACHE_TTL = 30000; // 30 seconds in development

export async function getSwaggerSpec(forceRefresh = false) {
  const now = Date.now();
  
  if (!cachedSpec || forceRefresh || (now - lastGenerated > CACHE_TTL)) {
    console.log('[Swagger] Generating fresh spec...');
    cachedSpec = await generateSwaggerSpec();
    lastGenerated = now;
  }
  
  return cachedSpec;
}
