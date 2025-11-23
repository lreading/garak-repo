import { NextResponse } from 'next/server';
import { isReportReadonly } from '@/lib/config';

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Get application configuration
 *     description: Retrieve current application configuration settings
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reportReadonly:
 *                   type: boolean
 *                   description: Whether reports are in readonly mode
 *       500:
 *         description: Failed to get configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  try {
    return NextResponse.json({
      reportReadonly: isReportReadonly()
    });
  } catch (error) {
    console.error('Failed to get config:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500 }
    );
  }
}
