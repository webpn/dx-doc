// API layer — public API surface
// REST transport: Fastify routes translate HTTP to application-service calls.
// See ARCHITECTURE.md §API and ADR-0007/0022.

export { registerAuthRoutes } from './auth/routes';
export type { AuthRoutesOptions } from './auth/routes';

export { registerAccessRoutes } from './access/routes';
export type { AccessRoutesOptions } from './access/routes';

export { registerCompanyRoutes } from './company/routes';
export type { CompanyRoutesOptions } from './company/routes';

export { registerLifecycleRoutes } from './lifecycle/routes';
export type { LifecycleRoutesOptions } from './lifecycle/routes';

export { registerTokenRoutes } from './tokens/routes';
export type { TokenRoutesOptions } from './tokens/routes';

export { registerProjectRoutes } from './projects/routes';
export type { ProjectRoutesOptions } from './projects/routes';

export { registerPageRoutes } from './pages/routes';
export type { PageRoutesOptions } from './pages/routes';

export { registerTrackingRoutes } from './tracking/routes';
export type { TrackingRoutesOptions } from './tracking/routes';

export { registerMcpRoutes } from './mcp/routes';
export type { McpRoutesOptions } from './mcp/routes';
export { McpServerHandler, MCP_TOOLS } from './mcp/server';

export { registerAllRoutes } from './routes';
export type { ApiRoutesOptions } from './routes';

export {
  assembleComposition,
  checkStartup,
  SESSION_COOKIE_NAME,
  StartupError,
} from './composition-root';
export type { Composition, CompositionOptions, ReadyStatus, ServedRoute } from './composition-root';

export { authenticateRequest, replyServiceError, unauthenticated } from './helpers';
export type { ActorKind, AuthenticatedActor } from './helpers';
