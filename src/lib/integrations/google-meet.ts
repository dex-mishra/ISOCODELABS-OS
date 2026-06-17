import { prisma } from '../db/prisma';
import { encrypt, decrypt } from '../auth/encrypt';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // timestamp in ms
  scope: string;
  email?: string;
}

/**
 * Generates the Google OAuth authorization URL
 */
export function getGoogleAuthUrl(userId: string): string {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.modify',
    state: userId,
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

/**
 * Exchanges authorization code for access and refresh tokens, storing them encrypted in DB
 */
export async function exchangeCodeForTokens(code: string, userId: string): Promise<boolean> {
  try {
    // If the credentials are mock, skip real API exchange and store mock tokens
    if (CLIENT_ID.startsWith('mock') || CLIENT_SECRET.startsWith('mock') || code === 'mock-code') {
      const mockTokens: GoogleTokens = {
        access_token: 'mock-access-token-' + Math.random().toString(36).substring(7),
        refresh_token: 'mock-refresh-token-' + Math.random().toString(36).substring(7),
        expires_at: Date.now() + 3600 * 1000, // 1 hour from now
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.modify',
        email: 'dex.mishra@gmail.com',
      };
      
      const encryptedValue = encrypt(JSON.stringify(mockTokens));
      const key = `google_tokens_user_${userId}`;

      await prisma.setting.upsert({
        where: { key },
        update: { value: encryptedValue, category: 'oauth' },
        create: { key, value: encryptedValue, category: 'oauth' },
      });
      return true;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google token exchange error: ${errText}`);
    }

    const data = await response.json();
    
    // Fetch email info from Google userinfo
    let email: string | undefined = undefined;
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (userinfoRes.ok) {
        const userinfo = await userinfoRes.json();
        email = userinfo.email;
      }
    } catch (err) {
      console.warn('Failed to fetch user email during Google OAuth code exchange:', err);
    }

    const tokens: GoogleTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      scope: data.scope || 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.modify',
      email,
    };

    const encryptedValue = encrypt(JSON.stringify(tokens));
    const key = `google_tokens_user_${userId}`;

    await prisma.setting.upsert({
      where: { key },
      update: { value: encryptedValue, category: 'oauth' },
      create: { key, value: encryptedValue, category: 'oauth' },
    });

    return true;
  } catch (error) {
    console.error('exchangeCodeForTokens error:', error);
    return false;
  }
}

/**
 * Gets a valid access token. Refreshes if expired.
 */
export async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const key = `google_tokens_user_${userId}`;
  const setting = await prisma.setting.findUnique({
    where: { key },
  });

  if (!setting) {
    return null;
  }

  try {
    const tokens: GoogleTokens = JSON.parse(decrypt(setting.value));
    
    // Check if expired (with 1 min buffer)
    const isExpired = tokens.expires_at - 60000 < Date.now();

    if (!isExpired) {
      return tokens.access_token;
    }

    // If mock tokens, just refresh by updating expiry
    if (tokens.access_token.startsWith('mock')) {
      tokens.expires_at = Date.now() + 3600 * 1000;
      await prisma.setting.update({
        where: { key },
        data: { value: encrypt(JSON.stringify(tokens)) },
      });
      return tokens.access_token;
    }

    if (!tokens.refresh_token) {
      console.warn('No refresh token available to refresh expired Google access token.');
      return null;
    }

    // Refresh Google API
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: tokens.refresh_token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh Google token:', await response.text());
      return null;
    }

    const data = await response.json();
    const updatedTokens: GoogleTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokens.refresh_token, // keep old if not returned
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      scope: data.scope || tokens.scope,
    };

    await prisma.setting.update({
      where: { key },
      data: { value: encrypt(JSON.stringify(updatedTokens)) },
    });

    return updatedTokens.access_token;
  } catch (error) {
    console.error('getGoogleAccessToken error:', error);
    return null;
  }
}

/**
 * Creates a Calendar event with Google Meet link. Falls back to mock link if Google is not connected/fails.
 */
export async function createMeetingWithGoogleMeet(
  meetingData: {
    title: string;
    description?: string | null;
    scheduled_at: Date | string;
    duration: number;
  },
  userId: string
): Promise<{ google_meet_link: string; google_calendar_event_id: string | null }> {
  const mockMeetLink = `https://meet.google.com/mock-${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(5, 9)}-${Math.random().toString(36).substring(9, 12)}`;
  
  try {
    const accessToken = await getGoogleAccessToken(userId);
    
    // If no integration or mock token, return mock Meet link
    if (!accessToken || accessToken.startsWith('mock')) {
      return {
        google_meet_link: mockMeetLink,
        google_calendar_event_id: 'mock-event-' + Math.random().toString(36).substring(7),
      };
    }

    const startTime = new Date(meetingData.scheduled_at);
    const endTime = new Date(startTime.getTime() + meetingData.duration * 60 * 1000);

    const eventPayload = {
      summary: meetingData.title,
      description: meetingData.description || '',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      conferenceData: {
        createRequest: {
          requestId: 'meet-' + Math.random().toString(36).substring(7),
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      }
    );

    if (!response.ok) {
      console.warn('Google Calendar event creation failed:', await response.text());
      return {
        google_meet_link: mockMeetLink,
        google_calendar_event_id: null,
      };
    }

    const data = await response.json();
    
    // Extract google meet link
    const meetEntryPoint = data.conferenceData?.entryPoints?.find(
      (ep: { entryPointType: string; uri?: string }) => ep.entryPointType === 'video'
    );

    return {
      google_meet_link: meetEntryPoint?.uri || mockMeetLink,
      google_calendar_event_id: data.id,
    };
  } catch (error) {
    console.error('createMeetingWithGoogleMeet failed, falling back to mock link:', error);
    return {
      google_meet_link: mockMeetLink,
      google_calendar_event_id: null,
    };
  }
}
