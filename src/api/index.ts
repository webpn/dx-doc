// API layer — public API surface
// REST transport: Fastify routes translate HTTP to application-service calls.
// See ARCHITECTURE.md §API and ADR-0007/0022.

export { registerAuthRoutes } from './auth/routes';
export type { AuthRoutesOptions } from './auth/routes';

export { registerProjectRoutes } from './projects/routes';
export type { ProjectRoutesOptions } from './projects/routes';

export { registerPageRoutes } from './pages/routes';
export type { PageRoutesOptions } from './pages/routes';

export { registerTrackingRoutes } from './tracking/routes';
export type { TrackingRoutesOptions } from './tracking/routes';

export { authenticateRequest, replyServiceError, unauthenticated } from './helpers';
