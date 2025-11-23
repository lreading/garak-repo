import { NextRequest, NextResponse } from 'next/server';
import { getSwaggerSpec } from '@/lib/swagger-config';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: Get OpenAPI specification
 *     description: Returns the OpenAPI/Swagger specification for this API
 *     tags: [System]
 *     parameters:
 *       - in: query
 *         name: refresh
 *         schema:
 *           type: boolean
 *         description: Force refresh of the specification
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: OpenAPI 3.0 specification
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    const spec = await getSwaggerSpec(forceRefresh);
    
    return NextResponse.json(spec, {
      headers: {
        'Cache-Control': 'public, max-age=30', // Cache for 30 seconds
      },
    });
  } catch (error) {
    console.error('[API] Failed to generate Swagger spec:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to generate API documentation',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
