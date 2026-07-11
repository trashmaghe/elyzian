import { ConfigService } from '@nestjs/config';

export interface GlpiSessionHeaders {
  'App-Token': string;
  'Session-Token': string;
  [key: string]: string;
}

let sessionToken: string | null = null;

async function requestSessionToken(
  configService: ConfigService,
): Promise<string> {
  const glpiUrl = configService.get<string>('GLPI_URL')!;
  const appToken = configService.get<string>('GLPI_APP_TOKEN')!;
  const userToken = configService.get<string>('GLPI_USER_TOKEN')!;

  const response = await fetch(
    `${glpiUrl}/apirest.php/initSession?session_write=true`,
    {
      headers: {
        'App-Token': appToken,
        Authorization: `user_token ${userToken}`,
      },
    },
  );
  if (!response.ok) {
    throw new Error('GLPI initSession failed');
  }
  const body = (await response.json()) as { session_token: string };
  return body.session_token;
}

async function initSession(configService: ConfigService): Promise<string> {
  sessionToken = await requestSessionToken(configService);
  return sessionToken;
}

function isSessionTokenInvalid(body: unknown): boolean {
  return Array.isArray(body) && body[0] === 'ERROR_SESSION_TOKEN_INVALID';
}

// GLPI sessions are long-lived; cache the token in memory and only reinit
// when the API tells us it's stale, rather than reauthenticating per call.
export async function withSession(
  configService: ConfigService,
  fn: (headers: GlpiSessionHeaders) => Promise<Response>,
): Promise<Response> {
  const appToken = configService.get<string>('GLPI_APP_TOKEN')!;
  const token = sessionToken ?? (await initSession(configService));

  let response = await fn({ 'App-Token': appToken, 'Session-Token': token });

  if (response.status === 401) {
    const body: unknown = await response
      .clone()
      .json()
      .catch(() => null);
    if (isSessionTokenInvalid(body)) {
      const freshToken = await initSession(configService);
      response = await fn({
        'App-Token': appToken,
        'Session-Token': freshToken,
      });
    }
  }

  return response;
}

export function resetGlpiSessionForTests(): void {
  sessionToken = null;
}
