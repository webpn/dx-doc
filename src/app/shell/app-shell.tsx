import {
  AppHeader,
  AppMain,
  AppShell as AppShellLayout,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@project/design-system';
import { ChevronDown, LogOut } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { useLogout } from '../queries';
import { useSessionStore } from '../stores/session-store';

function UserMenu(): ReactElement {
  const session = useSessionStore((state) => state.session);
  const logout = useLogout();
  const navigate = useNavigate();

  if (session === null) return <></>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          {session.userId}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>{session.userId}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            logout.mutate(undefined, {
              onSuccess: () => {
                void navigate('/login');
              },
            });
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell(props: { children?: ReactNode }): ReactElement {
  return (
    <AppShellLayout>
      <AppHeader>
        <span className="text-lg font-extrabold tracking-tight text-[var(--color-ink)]">
          dx-doc
        </span>
        <UserMenu />
      </AppHeader>
      <AppMain>{props.children ?? <Outlet />}</AppMain>
    </AppShellLayout>
  );
}
