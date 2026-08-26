export { ApiClientError, ApiNetworkError, type ApiErrorBody, type ValidationIssue } from './client';
export { authApi, type AuthenticatedUser, type LoginResponse } from './auth';
export {
  companiesApi,
  type CompanyRecord,
  type CompanySummary,
  type CompanyCreateInput,
  type CompanyUpdateInput,
} from './companies';
export {
  projectsApi,
  type ProjectRecord,
  type ProjectCreateInput,
  type ProjectUpdateInput,
  type Platform,
  PLATFORMS,
} from './projects';
export {
  grantsApi,
  type ProjectGrant,
  type ProjectAccessRow,
  type RoleName,
  ROLE_NAMES,
} from './grants';
export { instanceAdminApi, type InstanceAdminStepUp, type StepUpOpenInput } from './instance-admin';
export { usersApi } from './users';
export { assetsApi, type AssetRecord, type AssetUploadResult } from './assets';
export { pagesApi, type Page, type PageCreateInput, type PageUpdateInput } from './pages';
export {
  freePagesApi,
  type FreePage,
  type FreePageCreateInput,
  type FreePageUpdateInput,
} from './free-pages';
export {
  trackingsApi,
  navigationEventsApi,
  modulesApi,
  propertiesApi,
  destinationsApi,
  trackingTemplatesApi,
  catalogueApi,
  PRESENCE_VALUES,
  PROPERTY_DATA_SOURCES,
  PROPERTY_DATA_TYPES,
  PROPERTY_STATUSES,
  type Presence,
  type PropertySource,
  type Tracking,
  type TrackingProperty,
  type TrackingDetail,
  type TrackingCreateInput,
  type TrackingUpdateInput,
  type RemovePropertyResult,
  type SpecificValue,
  type NavigationEvent,
  type Module,
  type DataLayerProperty,
  type PropertyDataSource,
  type PropertyDataType,
  type PropertyStatus,
  type PropertyUpdateInput,
  type ModuleUpdateInput,
  type Destination,
  type DestinationUpdateInput,
  type TrackingTemplate,
  type TrackingTemplateUpdateInput,
  type CatalogueCopyResult,
} from './trackings';
