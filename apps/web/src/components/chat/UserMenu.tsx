import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Moon, Sun } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { logout } from '@/lib/auth-api';
import { useUIStore } from '@/stores/useUIStore';
import { Button } from '@/components/ui/button';

export function UserMenu() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['currentUser'] }),
  });

  return (
    <div data-slot="user-menu" className="flex items-center justify-between gap-2 border-t p-3">
      <span className="truncate text-sm text-muted-foreground">{currentUser?.displayName}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
