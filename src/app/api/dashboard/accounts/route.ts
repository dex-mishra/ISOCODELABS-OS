import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { encrypt } from '@/lib/auth/encrypt';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/dashboard/accounts - list all connected accounts
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const accounts = await prisma.dashboardAccount.findMany({
      orderBy: { created_at: 'desc' },
    });

    // Remove sensitive/credential info before returning to frontend
    const safeAccounts = accounts.map(acc => {
      const metricsObj = (acc.metrics && typeof acc.metrics === 'object')
        ? (acc.metrics as Record<string, unknown>)
        : {};

      // Clone metricsObj and delete credentials
      const cleanMetrics = { ...metricsObj };
      delete cleanMetrics.credentials;

      return {
        id: acc.id,
        name: acc.name,
        provider: acc.provider,
        last_synced_at: acc.last_synced_at,
        created_at: acc.created_at,
        metrics: cleanMetrics
      };
    });

    return NextResponse.json(safeAccounts);
  } catch (error) {
    console.error('GET dashboard accounts error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while retrieving tracked accounts.' },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/accounts - add a tracked platform
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { platform, account_id, credentials } = body;

    if (!platform || !account_id) {
      return NextResponse.json({ error: 'Platform and Account ID are required.' }, { status: 400 });
    }

    // Encrypt the credentials if provided
    const encryptedCredentials = credentials ? encrypt(credentials) : '';

    // Generate rich metrics based on the provider/platform
    const generatedMetrics: Record<string, unknown> = {
      account_id,
      credentials: encryptedCredentials
    };

    const isSocial = ['twitter', 'linkedin', 'youtube', 'instagram', 'facebook'].includes(platform.toLowerCase());
    const isAnalytics = ['google_analytics', 'fathom'].includes(platform.toLowerCase());

    if (isSocial) {
      // Mock metrics for social platforms
      generatedMetrics.followers = Math.floor(Math.random() * 8000) + 1200;
      generatedMetrics.engagement_rate = parseFloat((Math.random() * 6 + 1).toFixed(2));
      generatedMetrics.recent_posts = [
        {
          id: 'post-1',
          content: `Celebrating our latest milestones with the ops hub! 🚀 #isocodelabs`,
          likes: Math.floor(Math.random() * 100) + 20,
          shares: Math.floor(Math.random() * 30) + 5,
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'post-2',
          content: `How to keep workflows light and efficient in small teams. 💡`,
          likes: Math.floor(Math.random() * 200) + 50,
          shares: Math.floor(Math.random() * 50) + 10,
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    } else if (isAnalytics) {
      // Mock metrics for analytics/website traffic
      generatedMetrics.page_views = Math.floor(Math.random() * 15000) + 5000;
      generatedMetrics.sessions = Math.floor(Math.random() * 8000) + 2000;
      generatedMetrics.bounce_rate = parseFloat((Math.random() * 20 + 35).toFixed(1));

      // Generate 7 days history
      const history = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        history.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          views: Math.floor(Math.random() * 2000) + 800,
          sessions: Math.floor(Math.random() * 1000) + 300
        });
      }
      generatedMetrics.history = history;

      generatedMetrics.top_pages = [
        { path: '/', views: Math.floor(Math.random() * 3000) + 1000 },
        { path: '/workspace', views: Math.floor(Math.random() * 2000) + 500 },
        { path: '/pricing', views: Math.floor(Math.random() * 800) + 200 },
        { path: '/docs', views: Math.floor(Math.random() * 500) + 100 }
      ];
    } else {
      // Catch-all basic metrics
      generatedMetrics.status = 'connected';
    }

    const providerName = platform.toLowerCase();

    const account = await prisma.dashboardAccount.create({
      data: {
        name: `${platform.toUpperCase()} - ${account_id}`,
        provider: providerName,
        metrics: generatedMetrics as Prisma.InputJsonValue,
        last_synced_at: new Date()
      }
    });

    // Clean metrics response
    const safeMetrics = { ...generatedMetrics };
    delete safeMetrics.credentials;

    return NextResponse.json({
      id: account.id,
      name: account.name,
      provider: account.provider,
      last_synced_at: account.last_synced_at,
      metrics: safeMetrics
    }, { status: 201 });

  } catch (error) {
    console.error('POST dashboard accounts error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while linking the account.' },
      { status: 500 }
    );
  }
}
