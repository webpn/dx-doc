import type { AssetService } from '@project/application/asset/asset-service';
import type { AuthService } from '@project/application/auth/auth-service';
import type { GrantService } from '@project/application/auth/grant-service';
import type { LifecycleService } from '@project/application/auth/lifecycle-service';
import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { CompanyService } from '@project/application/company/company-service';
import type { PageService } from '@project/application/page/page-service';
import type { AccountRepository } from '@project/application/ports/account-repository';
import type { AuditLogRepository } from '@project/application/ports/tracking-repositories';
import type { ProjectService } from '@project/application/project/project-service';
import type { TrackingService } from '@project/application/tracking/tracking-service';
import type { FastifyInstance } from 'fastify';

import { registerAccessRoutes } from './access/routes';
import { registerAssetRoutes } from './assets/routes';
import { registerAuthRoutes } from './auth/routes';
import { registerCompanyRoutes } from './company/routes';
import { registerLifecycleRoutes } from './lifecycle/routes';
import { registerMcpRoutes } from './mcp/routes';
import { McpServerHandler } from './mcp/server';
import { registerPageRoutes } from './pages/routes';
import { registerProjectRoutes } from './projects/routes';
import { registerTokenRoutes } from './tokens/routes';
import { registerTrackingRoutes } from './tracking/routes';

export interface ApiRoutesOptions {
  projectService: ProjectService;
  pageService: PageService;
  trackingService: TrackingService;
  assetService: AssetService;
  auth: AuthService;
  sessions: SessionService;
  serviceTokens: ServiceTokenService;
  lifecycle: LifecycleService;
  companyService: CompanyService;
  grantService: GrantService;
  accounts: AccountRepository;
  cookieName: string;
  sessionTtlMs: number;
  auditLogs: AuditLogRepository;
}

/**
 * Register all application REST and MCP API routes (ADR-0007, ADR-0022),
 * including authentication (REQ-FDN-023: `registerAllRoutes` really does
 * register ALL routes).
 */
export function registerAllRoutes(app: FastifyInstance, options: ApiRoutesOptions): void {
  const {
    projectService,
    pageService,
    trackingService,
    assetService,
    auth,
    sessions,
    serviceTokens,
    lifecycle,
    companyService,
    grantService,
    accounts,
    cookieName,
    sessionTtlMs,
  } = options;

  registerAuthRoutes(app, { auth, sessions, accounts, cookieName, sessionTtlMs });

  registerProjectRoutes(app, {
    projects: projectService,
    sessions,
    serviceTokens,
    cookieName,
  });

  registerPageRoutes(app, {
    pages: pageService,
    sessions,
    serviceTokens,
    cookieName,
  });

  registerTrackingRoutes(app, {
    trackingService,
    sessions,
    serviceTokens,
    cookieName,
  });

  registerAssetRoutes(app, { assets: assetService, sessions, serviceTokens, cookieName });
  registerAccessRoutes(app, { grants: grantService, sessions, serviceTokens, cookieName });
  registerLifecycleRoutes(app, { lifecycle, sessions, serviceTokens, cookieName });
  registerCompanyRoutes(app, { companies: companyService, sessions, serviceTokens, cookieName });
  registerTokenRoutes(app, { tokens: serviceTokens, sessions, serviceTokens, cookieName });

  const mcpHandler = new McpServerHandler(
    projectService,
    pageService,
    trackingService,
    options.auditLogs,
    options.accounts,
  );
  registerMcpRoutes(app, {
    mcpHandler,
    sessions,
    serviceTokens,
    cookieName,
  });
}
