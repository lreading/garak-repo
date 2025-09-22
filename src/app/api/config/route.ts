import { NextResponse } from 'next/server';
import { isReportReadonly } from '@/lib/config';

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
