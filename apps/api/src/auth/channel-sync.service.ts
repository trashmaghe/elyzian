import { Injectable } from '@nestjs/common';
import { ChannelType, MemberRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChannelSyncService {
  constructor(private readonly prisma: PrismaService) {}

  // Keeps ChannelMember rows in lockstep with the AD groups (memberOf) the user
  // currently belongs to: joins channels for newly-seen groups, and leaves
  // AD-linked channels for groups the user is no longer a member of. Channels
  // without an adGroupDn (not AD-linked) are never touched by this sync.
  //
  // This runs on every login and must be safe when the *same* user logs in
  // concurrently (e.g. two browser tabs, or parallel e2e workers hitting the
  // shared seeded accounts). Prisma's `upsert` is not atomic — it emits a
  // SELECT followed by an INSERT — so two concurrent syncs can both decide to
  // INSERT the same (userId, channelId) and the loser hits a duplicate-key
  // violation (ChannelMember_pkey, P2002). We avoid that by using conflict-safe
  // writes (`INSERT ... ON CONFLICT DO NOTHING`) instead of read-then-write.
  async syncChannelsForUser(
    userId: string,
    memberOfDns: string[],
  ): Promise<void> {
    const channelIds: string[] = [];
    for (const dn of memberOfDns) {
      const channel = await this.ensureChannel(dn);
      channelIds.push(channel.id);
    }

    if (channelIds.length > 0) {
      // createMany + skipDuplicates compiles to ON CONFLICT DO NOTHING, which is
      // atomic at the DB level. The desired end state is simply "the membership
      // row exists"; the old upsert only ever did `update: {}` (a no-op), so
      // skipping an already-present row preserves the exact previous behaviour
      // while removing the race.
      await this.prisma.channelMember.createMany({
        data: channelIds.map((channelId) => ({
          userId,
          channelId,
          role: MemberRole.MEMBER,
        })),
        skipDuplicates: true,
      });
    }

    await this.prisma.channelMember.deleteMany({
      where: {
        userId,
        channel: { adGroupDn: { not: null, notIn: memberOfDns } },
      },
    });
  }

  // Upsert the AD-linked channel, tolerating a concurrent creator: if two logins
  // race to create the same adGroupDn, one wins and the other catches the unique
  // violation and re-reads the now-existing row instead of surfacing a 500.
  private async ensureChannel(
    dn: string,
  ): Promise<{ id: string }> {
    try {
      return await this.prisma.channel.upsert({
        where: { adGroupDn: dn },
        create: {
          name: this.slugFromDn(dn),
          displayName: this.cnFromDn(dn),
          type: ChannelType.DEPARTMENT,
          adGroupDn: dn,
        },
        update: {},
        select: { id: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prisma.channel.findUniqueOrThrow({
          where: { adGroupDn: dn },
          select: { id: true },
        });
      }
      throw error;
    }
  }

  private cnFromDn(dn: string): string {
    const match = /^cn=([^,]+)/i.exec(dn);
    return match ? match[1] : dn;
  }

  private slugFromDn(dn: string): string {
    return this.cnFromDn(dn)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
