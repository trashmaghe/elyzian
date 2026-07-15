import { Outlet } from 'react-router-dom';
import { SocketProvider } from '@/providers/SocketProvider';
import { ChannelSidebar } from '@/components/chat/ChannelSidebar';
import { IconRail } from '@/components/chat/IconRail';

export function ChatLayout() {
  return (
    <SocketProvider>
      <div className="flex h-screen bg-background">
        <IconRail />
        <ChannelSidebar />
        <main className="flex flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </SocketProvider>
  );
}
