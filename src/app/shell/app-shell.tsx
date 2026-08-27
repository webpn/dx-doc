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

import { useFormatters, useTranslate } from '../i18n';
import { useLogout, useStepUps } from '../queries';
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

/**
 * The "unmistakable indicator" ADR-0027 promises for an open step-up window.
 * Lives in the shell rather than on any one page: a step-up is a standing
 * authorisation fact independent of the current route (an instance
 * administrator can carry it from the project list to the catalogue), and
 * ADR-0027 frames it as a safety property precisely so it is not a mode the
 * administrator can navigate away from and forget they are in.
 */
function StepUpIndicator(): ReactElement | null {
  const t = useTranslate();
  const { formatDateTime } = useFormatters();
  const session = useSessionStore((state) => state.session);
  const isInstanceAdmin = session?.instanceAdmin === true;
  const stepUps = useStepUps(isInstanceAdmin);

  if (stepUps.data === undefined) return null;

  const now = new Date();
  const active = stepUps.data
    .filter((stepUp) => new Date(stepUp.expiresAt) > now)
    .sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt));
  const soonest = active[0];
  if (soonest === undefined) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-info)]/40 bg-[var(--color-info-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-info)]"
      role="status"
    >
      {active.length > 1
        ? t('stepUp.indicatorMultiple', {
            count: active.length,
            expiresAt: formatDateTime(soonest.expiresAt),
          })
        : t('stepUp.indicator', {
            companyId: soonest.companyId,
            expiresAt: formatDateTime(soonest.expiresAt),
          })}
    </span>
  );
}

export function AppShell(props: { children?: ReactNode }): ReactElement {
  const t = useTranslate();
  const session = useSessionStore((state) => state.session);
  return (
    <AppShellLayout>
      <AppHeader>
        <div className="flex items-center gap-6">
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
          {session?.instanceAdmin === true ? <StepUpIndicator /> : null}
        </div>
        <UserMenu />
      </AppHeader>
      <AppMain>{props.children ?? <Outlet />}</AppMain>
    </AppShellLayout>
  );
}
