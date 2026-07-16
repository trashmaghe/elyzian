import { useEffect, useRef } from 'react';
import type { Message } from '@munichat/shared';
import { useChannelMessages } from '@/hooks/useChannelMessages';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { computeMessageGrouping } from '@/lib/message-grouping';
import { MessageItem } from '@/components/chat/MessageItem';
import { Button } from '@/components/ui/button';

const NEAR_BOTTOM_THRESHOLD_PX = 100;

// Reactions have no backend yet (Phase 7 backlog) — these two demo pills, pinned
// to the newest couple of messages, exist only to make the new UI visible.
function getDemoReactions(index: number, total: number): { emoji: string; count: number }[] | undefined {
  if (index === total - 1) return [{ emoji: '👍', count: 1 }, { emoji: '🎉', count: 1 }];
  if (index === total - 3) return [{ emoji: '👀', count: 2 }];
  return undefined;
}

export function MessageList({
  channelId,
  onReply,
  onEdit,
  onDelete,
}: {
  channelId: string;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
}) {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useChannelMessages(channelId);
  const { data: currentUser } = useCurrentUser();
  const containerRef = useRef<HTMLDivElement>(null);
  const wasNearBottomRef = useRef(true);

  const messages = data ? [...data.pages].reverse().flatMap((page) => page.messages) : [];
  const groupingFlags = computeMessageGrouping(messages);

  useEffect(() => {
    const container = containerRef.current;
    if (container && wasNearBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  function handleScroll() {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    wasNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      data-slot="message-list"
      className="flex flex-1 flex-col overflow-y-auto"
    >
      {hasNextPage && (
        <div className="flex justify-center py-2">
          <Button variant="ghost" size="sm" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
          </Button>
        </div>
      )}
      {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading messages…</p>}
      {messages.map((message, index) => (
        <MessageItem
          key={message.id}
          message={message}
          isOwn={message.authorId === currentUser?.id}
          isGrouped={groupingFlags[index] ?? false}
          reactions={getDemoReactions(index, messages.length)}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
