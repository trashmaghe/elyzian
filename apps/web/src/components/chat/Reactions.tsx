export function Reactions({ reactions }: { reactions?: { emoji: string; count: number }[] }) {
  if (!reactions?.length) return null;

  return (
    <div data-slot="reactions" className="flex flex-wrap gap-1">
      {reactions.map((reaction) => (
        <span
          key={reaction.emoji}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-0.5 text-xs"
        >
          <span>{reaction.emoji}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{reaction.count}</span>
        </span>
      ))}
    </div>
  );
}
