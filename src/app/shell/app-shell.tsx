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
import { Link, Outlet, useNavigate } from 'react-router-dom';

import { useTranslate } from '../i18n';
import { useLogout } from '../queries';
import { useSessionStore } from '../stores/session-store';

function UserMenu(): ReactElement {
  const t = useTranslate();
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
          {t('app.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell(props: { children?: ReactNode }): ReactElement {
  const t = useTranslate();
  const session = useSessionStore((state) => state.session);
  return (
    <AppShellLayout>
      <AppHeader>
        <span className="text-lg font-extrabold tracking-tight text-[var(--color-ink)]">
          {t('app.name')}
        </span>
        {session?.instanceAdmin === true ? (
          <Link
            className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            to="/companies"
          >
            {t('company.list.title')}
          </Link>
        ) : null}
        <UserMenu />
      </AppHeader>
      <AppMain>{props.children ?? <Outlet />}</AppMain>
    </AppShellLayout>
  );
}
