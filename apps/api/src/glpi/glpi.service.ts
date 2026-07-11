import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { withSession } from './glpi.session';
import { mapGlpiStatus } from './glpi.status';

const REQUEST_TIMEOUT_MS = 10000;

export class GlpiUnavailableError extends Error {
  constructor(message = 'GLPI is unreachable') {
    super(message);
    this.name = 'GlpiUnavailableError';
  }
}

export interface CreateTicketInput {
  title: string;
  content: string;
  requesterLabel: string;
}

export interface CreateTicketResult {
  glpiTicketId: number;
  status: string;
}

export interface GetTicketResult {
  status: string;
}

@Injectable()
export class GlpiService {
  constructor(private readonly configService: ConfigService) {}

  private get glpiUrl(): string {
    return this.configService.get<string>('GLPI_URL')!;
  }

  async createTicket(input: CreateTicketInput): Promise<CreateTicketResult> {
    const response = await this.request(() =>
      withSession(this.configService, (headers) =>
        fetch(`${this.glpiUrl}/apirest.php/Ticket/`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: {
              name: input.title,
              content: `${input.requesterLabel}\n\n${input.content}`,
            },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }),
      ),
    );

    if (!response.ok) {
      throw new GlpiUnavailableError();
    }

    const body = (await response.json()) as { id: number };
    return { glpiTicketId: body.id, status: mapGlpiStatus(1) };
  }

  async getTicket(glpiTicketId: number): Promise<GetTicketResult | null> {
    const response = await this.request(() =>
      withSession(this.configService, (headers) =>
        fetch(`${this.glpiUrl}/apirest.php/Ticket/${glpiTicketId}`, {
          headers,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }),
      ),
    );

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new GlpiUnavailableError();
    }

    const body = (await response.json()) as { status: number };
    return { status: mapGlpiStatus(body.status) };
  }

  private async request(fn: () => Promise<Response>): Promise<Response> {
    try {
      return await fn();
    } catch {
      throw new GlpiUnavailableError();
    }
  }
}
