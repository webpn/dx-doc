import type { AuthService } from '@project/application/auth/auth-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { PageService } from '@project/application/page/page-service';
import type { ProjectService } from '@project/application/project/project-service';
import type { TrackingService } from '@project/application/tracking/tracking-service';
import type { FastifyInstance } from 'fastify';

import { registerAuthRoutes } from './auth/routes';
import { registerMcpRoutes } from './mcp/routes';
import { McpServerHandler } from './mcp/server';
import { registerPageRoutes } from './pages/routes';
import { registerProjectRoutes } from './projects/routes';
import { registerTrackingRoutes } from './tracking/routes';

export interface ApiRoutesOptions {
  projectService: ProjectService;
  pageService: PageService;
  trackingService: TrackingService;
  auth: AuthService;
  sessions: SessionService;
  cookieName: string;
  sessionTtlMs: number;
}

/**
 * Register all application REST and MCP API routes (ADR-0007, ADR-0022),
 * including authentication (REQ-FDN-023: `registerAllRoutes` really does
 * register ALL routes).
 */
export function registerAllRoutes(app: FastifyInstance, options: ApiRoutesOptions): void {
  const { projectService, pageService, trackingService, auth, sessions, cookieName, sessionTtlMs } =
    options;

  registerAuthRoutes(app, { auth, sessions, cookieName, sessionTtlMs });

  registerProjectRoutes(app, {
    projects: projectService,
    sessions,
    cookieName,
  });

  registerPageRoutes(app, {
    pages: pageService,
    sessions,
    cookieName,
  });

  registerTrackingRoutes(app, {
    trackingService,
    sessions,
    cookieName,
  });

  const mcpHandler = new McpServerHandler(projectService, pageService, trackingService);
  registerMcpRoutes(app, {
    mcpHandler,
    sessions,
    cookieName,
  });
}
