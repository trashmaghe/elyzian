import { useChannelMembers } from '@/hooks/useChannelMembers';
import { useChatStore } from '@/stores/useChatStore';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/chat/UserAvatar';

const MAX_SHOWN_AVATARS = 3;

export function PresenceCluster({ channelId }: { channelId: string }) {
  const { data: members } = useChannelMembers(channelId);
  const onlineUserIds = useChatStore((state) => state.onlineUserIds);

  const onlineMembers = (members ?? []).filter((member) => onlineUserIds.has(member.userId));
  if (onlineMembers.length === 0) {
    return null;
  }

  const shown = onlineMembers.slice(0, MAX_SHOWN_AVATARS);

  return (
    <div data-slot="presence-cluster" className="flex items-center gap-2">
      <div className="flex">
        {shown.map((member, index) => (
          <UserAvatar
            key={member.userId}
            user={member.user}
            className={cn('size-6 border-2 border-background', index > 0 && '-ml-2')}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{onlineMembers.length} online</span>
    </div>
  );
}
