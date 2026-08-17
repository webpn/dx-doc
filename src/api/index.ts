// API layer — public API surface
// REST transport: Fastify routes translate HTTP to application-service calls.
// See ARCHITECTURE.md §API and ADR-0007/0022.

export { registerAuthRoutes } from './auth/routes';
export type { AuthRoutesOptions } from './auth/routes';
