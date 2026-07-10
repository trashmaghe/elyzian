import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MessageType } from '@prisma/client';
import { PendingAttachment } from '@munichat/shared';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { GlpiService, GlpiUnavailableError } from '../glpi/glpi.service';
import { LinkPreviewJobData, QUEUE_NAMES } from '../queue/queue-names';
import {
  decodeCursor,
  encodeCursor,
  MessageWithExtras,
} from './message-response.mapper';

const URL_PATTERN = /https?:\/\/\S+/i;
const TICKET_PREFIX_PATTERN = /^\/ticket(?:\s+([\s\S]*))?$/i;
const TICKET_TITLE_MAX_LENGTH = 80;

const MESSAGE_INCLUDE = {
  author: true,
  attachments: true,
  linkPreview: true,
  ticketRef: true,
  replyTo: { include: { author: true, attachments: true } },
} as const;

export interface GetHistoryOptions {
  cursor?: string;
  limit: number;
}

export interface HistoryPage {
  messages: MessageWithExtras[];
  nextCursor: string | null;
}

export interface CreateMessageInput {
  channelId: string;
  authorId: string;
  content: string;
  replyToId?: string | null;
  attachments?: PendingAttachment[];
}

export type CreateMessageResult =
  { message: MessageWithExtras } | { error: string };

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly glpiService: GlpiService,
    @InjectQueue(QUEUE_NAMES.LINK_PREVIEW)
    private readonly linkPreviewQueue: Queue<LinkPreviewJobData>,
  ) {}

  async getHistory(
    channelId: string,
    { cursor, limit }: GetHistoryOptions,
  ): Promise<HistoryPage> {
    const decoded = cursor ? decodeCursor(cursor) : null;

    const rows = await this.prisma.message.findMany({
      where: {
        channelId,
        ...(decoded
          ? {
              OR: [
                { createdAt: { lt: decoded.createdAt } },
                { createdAt: decoded.createdAt, id: { lt: decoded.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: MESSAGE_INCLUDE,
    });

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const nextCursor = hasMore ? encodeCursor(page[page.length - 1]) : null;

    return { messages: page.reverse(), nextCursor };
  }

  async getById(id: string): Promise<MessageWithExtras | null> {
    return this.prisma.message.findUnique({
      where: { id },
      include: MESSAGE_INCLUDE,
    });
  }

  async create({
    channelId,
    authorId,
    content,
    replyToId,
    attachments,
  }: CreateMessageInput): Promise<CreateMessageResult> {
    const ticketMatch = TICKET_PREFIX_PATTERN.exec(content);
    if (ticketMatch) {
      return this.createTicketMessage(
        channelId,
        authorId,
        (ticketMatch[1] ?? '').trim(),
      );
    }

    for (const attachment of attachments ?? []) {
      const realSize = await this.filesService.getRealObjectSize(
        attachment.objectKey,
      );
      if (realSize === null) {
        return { error: 'Attachment was not found in storage' };
      }
      if (realSize !== attachment.sizeBytes) {
        return { error: 'Attachment size does not match the uploaded file' };
      }
    }

    const hasAttachments = (attachments?.length ?? 0) > 0;
    const type =
      hasAttachments && content.trim().length === 0
        ? MessageType.FILE
        : MessageType.TEXT;

    const message = await this.prisma.message.create({
      data: {
        channelId,
        authorId,
        content,
        type,
        replyToId: replyToId ?? null,
        attachments: hasAttachments
          ? {
              create: (attachments ?? []).map((attachment) => ({
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                sizeBytes: attachment.sizeBytes,
                objectKey: attachment.objectKey,
              })),
            }
          : undefined,
      },
      include: MESSAGE_INCLUDE,
    });

    const url = content.match(URL_PATTERN)?.[0];
    if (url) {
      await this.linkPreviewQueue.add(
        'fetch-og-tags',
        { messageId: message.id, channelId, url },
        {
          attempts: 2,
          backoff: { type: 'fixed', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
    }

    return { message };
  }

  private async createTicketMessage(
    channelId: string,
    authorId: string,
    description: string,
  ): Promise<CreateMessageResult> {
    if (!description) {
      return { error: 'Ticket description cannot be empty' };
    }

    const author = await this.prisma.user.findUniqueOrThrow({
      where: { id: authorId },
    });

    let ticket: { glpiTicketId: number; status: string };
    try {
      ticket = await this.glpiService.createTicket({
        title: description.slice(0, TICKET_TITLE_MAX_LENGTH),
        content: description,
        requesterLabel: `Reported via MuniChat by ${author.displayName} (${author.username})`,
      });
    } catch (err) {
      if (err instanceof GlpiUnavailableError) {
        return { error: 'GLPI is unreachable. Please try again later.' };
      }
      throw err;
    }

    const message = await this.prisma.message.create({
      data: {
        channelId,
        authorId,
        content: description,
        type: MessageType.TICKET,
        ticketRef: {
          create: {
            glpiTicketId: ticket.glpiTicketId,
            status: ticket.status,
            createdById: authorId,
          },
        },
      },
      include: MESSAGE_INCLUDE,
    });

    return { message };
  }

  async update(id: string, content: string): Promise<MessageWithExtras> {
    return this.prisma.message.update({
      where: { id },
      data: { content, editedAt: new Date() },
      include: MESSAGE_INCLUDE,
    });
  }

  async softDelete(id: string): Promise<MessageWithExtras> {
    return this.prisma.message.update({
      where: { id },
      data: { content: '', deletedAt: new Date() },
      include: MESSAGE_INCLUDE,
    });
  }
}
