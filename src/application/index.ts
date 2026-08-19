// Application layer — public API surface
// Use cases, ports, and CQRS-lite commands/queries. No React, no browser, no
// network, no infrastructure imports. See ARCHITECTURE.md §Application.

export type { ObjectStorage } from './ports/storage';
export type { IndexableDocument, SearchIndex, SearchResult } from './ports/search';
export type { ImageProcessor, ProcessedImage } from './ports/image-processor';

export { COMPANY_ROLE_NAMES, isCompanyRoleName } from './auth/roles';
export type { CompanyRoleName } from './auth/roles';

export { generateSessionToken, hashSessionToken } from './auth/tokens';
export { SessionService } from './auth/session-service';
export type { NewSession } from './auth/session-service';
export { AuthService } from './auth/auth-service';
export type { ChangePasswordError, LoginResult } from './auth/auth-service';

export { COMPANY_ACTION_ROLES, PermissionService, PROJECT_ACTION_ROLES } from './auth/permissions';
export type { CompanyAction, InstanceAction, ProjectAction } from './auth/permissions';

export { LifecycleService } from './auth/lifecycle-service';
export type { LifecycleError } from './auth/lifecycle-service';

export { GrantService, GRANT_ADMIN_ACTION } from './auth/grant-service';
export type { GrantServiceError } from './auth/grant-service';

export { DEFAULT_SERVICE_TOKEN_TTL_MS, ServiceTokenService } from './auth/service-token-service';
export type {
  IssuedServiceToken,
  ServiceTokenError,
  ServiceTokenReadModel,
} from './auth/service-token-service';

export { BootstrapService, BootstrapConfigError } from './auth/bootstrap-service';
export type { BootstrapResult, BootstrapVariables } from './auth/bootstrap-service';

export { CompanyService } from './company/company-service';
export type { CompanyError } from './company/company-service';

export type { PasswordHasher } from './ports/password-hasher';

export type {
  AccountRepository,
  CompanyRole,
  CreateUserInput,
  ProjectGrant,
  UserAccount,
} from './ports/account-repository';

export type { SessionRecord, SessionRepository } from './ports/session-repository';

export type {
  PasswordResetToken,
  PasswordResetTokenRepository,
} from './ports/reset-token-repository';

export type {
  ApiServiceToken,
  NewServiceToken,
  ServiceTokenRepository,
} from './ports/service-token-repository';

export type { CompanyRecord, CompanyRepository } from './ports/company-repository';

export type { ProjectRecord, ProjectRepository } from './ports/project-repository';
export type { PageRecord, PageRepository } from './ports/page-repository';

export { ProjectService } from './project/project-service';
export type { ProjectServiceError, ProjectServiceRecord } from './project/project-service';

export { PageService } from './page/page-service';
export type { PageServiceError } from './page/page-service';

export type { EmailMessage, EmailSender } from './ports/email-sender';
export type {
  PropertyRepository,
  ModuleRepository,
  DestinationRepository,
  TrackingTemplateRepository,
  FreePageRepository,
  NavigationEventRepository,
  TrackingRepository,
} from './ports/tracking-repositories';
export { TrackingService } from './tracking/tracking-service';
export type { TrackingServiceError } from './tracking/tracking-service';

export { validate } from './validation/validate';
export {
  companyCreateSchema,
  pageCreateSchema,
  pageUpdateSchema,
  PLATFORMS,
  projectCreateSchema,
  projectUpdateSchema,
  propertyCreateSchema,
  propertyUpdateSchema,
  moduleCreateSchema,
  moduleUpdateSchema,
  destinationCreateSchema,
  destinationUpdateSchema,
  trackingTemplateCreateSchema,
  trackingTemplateUpdateSchema,
  freePageCreateSchema,
  freePageUpdateSchema,
  navigationEventCreateSchema,
  navigationEventUpdateSchema,
  trackingCreateSchema,
  trackingUpdateSchema,
  trackingPropertyPresenceSchema,
  specificValueCreateSchema,
  flowCreateSchema,
  flowUpdateSchema,
  triggerCreateSchema,
  triggerUpdateSchema,
  flowNodeSchema,
  flowEdgeSchema,
  flowGraphSchema,
  publishVersionSchema,
  projectSharedPasswordCreateSchema,
  projectSharedPasswordVerifySchema,
  PROPERTY_DATA_SOURCES,
  PROPERTY_DATA_TYPES,
  PROPERTY_STATUSES,
  PRESENCE_VALUES,
} from './validation/schemas';
export type {
  CompanyCreateInput,
  PageCreateInput,
  PageUpdateInput,
  Platform,
  ProjectCreateInput,
  ProjectUpdateInput,
  PropertyCreateInput,
  PropertyCreateOutput,
  PropertyUpdateInput,
  ModuleCreateInput,
  ModuleCreateOutput,
  ModuleUpdateInput,
  DestinationCreateInput,
  DestinationUpdateInput,
  TrackingTemplateCreateInput,
  TrackingTemplateCreateOutput,
  TrackingTemplateUpdateInput,
  FreePageCreateInput,
  FreePageCreateOutput,
  FreePageUpdateInput,
  NavigationEventCreateInput,
  NavigationEventCreateOutput,
  NavigationEventUpdateInput,
  TrackingCreateInput,
  TrackingUpdateInput,
  TrackingPropertyPresenceInput,
  SpecificValueCreateInput,
  FlowCreateInput,
  FlowCreateOutput,
  FlowUpdateInput,
  TriggerCreateInput,
  TriggerCreateOutput,
  TriggerUpdateInput,
  FlowNodeInput,
  FlowEdgeInput,
  FlowGraphInput,
  PublishVersionInput,
  PublishVersionOutput,
  ProjectSharedPasswordCreateInput,
  ProjectSharedPasswordVerifyInput,
} from './validation/schemas';
export type { ValidationIssue } from './validation/issues';
