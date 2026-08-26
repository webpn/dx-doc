/**
 * English message catalogue — the source of truth for every user-facing string
 * in the client (REQ-NFR-010).
 *
 * Keys are dotted and grouped by screen so a reader can find the string they
 * saw on screen. The values here are the exact English text that ships; the
 * `MessageKey` union in `../catalogue.ts` is derived from this object, so a key
 * that does not exist here cannot be referenced from a screen, and a locale
 * that omits a key is caught by the type checker rather than rendering blank.
 *
 * Placeholders use `{name}` and are typed via `MessageParams`: a message with
 * a placeholder cannot be rendered without supplying it.
 */
export const en = {
  // Shell
  'app.name': 'dx-doc',
  'app.nav.projects': 'Projects',
  'app.nav.designReview': 'Design review',
  'app.signOut': 'Sign out',
  'app.signingOut': 'Signing out…',

  // Login
  'auth.login.eyebrow': 'dx-doc',
  'auth.login.title': 'Sign in to your workspace',
  'auth.login.description': 'Access the tracking documentation projects assigned to your account.',
  'auth.login.emailLabel': 'Email address',
  'auth.login.companyIdLabel': 'Company ID',
  'auth.login.companyIdHint': 'Leave blank for an instance administrator.',
  'auth.session.loading': 'Signing you in…',
  'auth.login.companyChoiceLabel': 'Company',
  'auth.login.companyChoiceHint': 'This email is registered with more than one company.',
  'auth.login.passwordLabel': 'Password',
  'auth.login.forgotPassword': 'Forgot your password?',
  'auth.login.submit': 'Sign in',
  'auth.login.submitting': 'Signing in…',

  // Password change (first login / forced change)
  'auth.passwordChange.eyebrow': 'First sign-in',
  'auth.passwordChange.title': 'Choose a new password',
  'auth.passwordChange.description': 'Your bootstrap password must be changed before continuing.',
  'auth.passwordChange.currentLabel': 'Current password',
  'auth.passwordChange.newLabel': 'New password',
  'auth.passwordChange.minLengthHint': 'Use at least {min} characters.',
  'auth.passwordChange.submit': 'Save password',
  'auth.passwordChange.submitting': 'Saving…',
  'auth.passwordChange.wrongCurrent': 'The current password is incorrect.',
  'auth.passwordChange.weakPassword': 'Choose a stronger password.',

  // Password reset
  'auth.passwordReset.requestTitle': 'Reset your password',
  // The JSX original wrote this apostrophe as `&apos;` and wrapped the line;
  // JSX collapses that to single spaces, so the catalogue holds the rendered
  // form: a real apostrophe and one space between words.
  'auth.passwordReset.requestDescription':
    "We'll send a reset link to your email if an account matches — the response is the same either way.",
  'auth.passwordReset.requestSubmit': 'Send reset link',
  'auth.passwordReset.requestSubmitting': 'Sending…',
  'auth.passwordReset.requestSent': 'If that account exists, a reset link is on its way.',
  'auth.passwordReset.backToSignIn': 'Back to sign in',
  'auth.passwordReset.confirmTitle': 'Choose a new password',
  'auth.passwordReset.confirmDescription': 'Set a new password for your account.',
  'auth.passwordReset.confirmSubmit': 'Save password',
  'auth.passwordReset.confirmSubmitting': 'Saving…',
  'auth.passwordReset.confirmDone': 'Your password has been reset.',
  'auth.passwordReset.continueToSignIn': 'Continue to sign in',
  'auth.passwordReset.missingTokenTitle': 'Reset link missing',
  'auth.passwordReset.missingTokenDescription': 'This page needs a reset token in the URL.',
  'auth.passwordReset.requestNewLink': 'Request a new reset link',
  'auth.passwordReset.invalidToken':
    'This reset link is invalid or has expired. Request a new one.',

  // Project list
  'project.list.eyebrow': 'Workspace',
  'project.list.title': 'Your projects',
  'project.list.description':
    'Choose a project to continue. The list is filtered by your server-side project grants.',
  'project.list.loading': 'Loading projects…',
  'project.list.loadError': 'Unable to load projects. Check your connection and try again.',
  'project.list.empty': 'No projects are assigned to this account yet.',
  'project.list.emptyInstanceAdmin':
    'No projects are assigned to this account yet. As an instance administrator, create a company to get started.',
  'project.list.open': 'Open project',
  'project.list.countLabel': '{count} projects',
  'project.list.newProject': 'New project',
  'project.list.administerCompany': 'Administer this company',

  // Project page
  'project.detail.loadError': 'Unable to load this project.',

  // Company creation (REQ-SEC-014 — the first Admin is provisioned with the
  // company, so this screen is one operation, not two)
  'company.create.eyebrow': 'Instance administration',
  'company.create.title': 'Create a company',
  'company.create.description':
    'A company needs an administrator from the moment it exists. The address you enter here receives the first Admin account.',
  'company.create.nameLabel': 'Company name',
  'company.create.slugLabel': 'Slug',
  'company.create.slugHint': 'Used in URLs. Lowercase letters, numbers and hyphens.',
  'company.create.firstAdminLabel': 'First administrator email',
  'company.create.firstAdminHint':
    'They set their own password at first sign-in. You never choose it for them.',
  'company.create.submit': 'Create company',
  'company.create.submitting': 'Creating…',
  'company.create.missingName': 'Enter a company name.',
  'company.create.missingSlug': 'Enter a slug.',
  'company.create.missingFirstAdmin': 'Enter the email address of the first administrator.',
  'company.create.slugTaken': 'That slug is already taken. Choose another.',
  'company.create.cancel': 'Cancel',
  'company.create.link': 'Create a company',

  // Instance-admin step-up (ADR-0027 — re-authenticate to administer a
  // company the instance administrator does not belong to)
  'stepUp.eyebrow': 'Instance administration',
  'stepUp.title': 'Administer this company',
  'stepUp.description':
    'Confirm your password to open a short-lived window to administer this company. It expires on its own and is audited.',
  'stepUp.passwordLabel': 'Password',
  'stepUp.submit': 'Open step-up',
  'stepUp.submitting': 'Opening…',
  'stepUp.missingPassword': 'Enter your password.',

  // Company list (REQ-SEC-015 — instance-administration surface)
  'company.list.eyebrow': 'Instance administration',
  'company.list.title': 'Companies',
  'company.list.description':
    'Every tenant on this instance, and the actions the instance-administration capability grants: create, open, delete.',
  'company.list.loading': 'Loading companies…',
  'company.list.loadError': 'Unable to load companies. Check your connection and try again.',
  'company.list.deleteError': 'Unable to delete that company. Check your connection and try again.',
  'company.list.empty': 'No companies exist yet.',
  'company.list.columnName': 'Name',
  'company.list.columnSlug': 'Slug',
  'company.list.columnProjects': 'Projects',
  'company.list.columnActions': 'Actions',
  'company.list.open': 'Open',
  'company.list.delete': 'Delete',
  'company.list.confirmDelete':
    'Permanently delete "{name}" and everything in it? This cannot be undone.',

  // Project creation
  'project.create.title': 'Create a project',
  'project.create.description': 'A project holds one tracking plan for one platform.',
  'project.create.nameLabel': 'Project name',
  'project.create.slugLabel': 'Slug',
  'project.create.slugHint': 'Used in URLs. Lowercase letters, numbers and hyphens.',
  'project.create.platformLabel': 'Platform',
  'project.create.platformPlaceholder': 'Choose a platform',
  'project.create.descriptionLabel': 'Description',
  'project.create.descriptionHint': 'Optional.',
  'project.create.submit': 'Create project',
  'project.create.submitting': 'Creating…',
  'project.create.missingName': 'Enter a project name.',
  'project.create.missingSlug': 'Enter a slug.',
  'project.create.missingPlatform': 'Choose a platform.',

  // Project access (REQ-SEC-012 — invite and grant are separate steps)
  'access.title': 'Project access',
  'access.description': 'Who can reach this project, and in which role.',
  'access.userColumn': 'User',
  'access.roleColumn': 'Role',
  'access.actionsColumn': 'Actions',
  'access.empty': 'Nobody has been granted access to this project yet.',
  'access.loadError': 'Unable to load project access.',
  'access.roleFor': 'Role for {user}',
  'access.revokeFor': 'Revoke access for {user}',
  'access.revoke': 'Revoke',
  'access.invite.title': 'Invite someone to the company',
  'access.invite.description':
    'An invited user joins the company without access to any project. Grant a role above once they have accepted.',
  'access.invite.emailLabel': 'Invite by email',
  'access.invite.submit': 'Send invite',
  'access.invite.sending': 'Sending…',
  'access.invite.sent': 'Invitation sent.',
  'access.invite.missingEmail': 'Enter an email address.',

  // Markdown editor (REQ-AUTH-001, REQ-AUTH-002)
  'editor.image.noScope':
    'Choose a project before adding an image — an image is stored with the project it belongs to.',

  // Page editor (REQ-DOM-001)
  'page.edit.title': 'Edit page',
  'page.edit.subtitle': 'Name, place in the hierarchy, and what the screen does.',
  'page.edit.name': 'Name',
  'page.edit.slug': 'Slug',
  'page.edit.parent': 'Parent page',
  'page.edit.parentNone': 'No parent (top level)',
  'page.edit.description': 'Description',
  'page.edit.save': 'Save page',
  'page.edit.saved': 'Page saved.',
  'page.edit.loading': 'Loading page…',
  'page.edit.loadError': 'This page could not be loaded.',
  'page.edit.missingName': 'Enter a name.',
  'page.edit.missingSlug': 'Enter a slug.',

  // Free pages (REQ-AUTH-003)
  'freePage.list.title': 'Free pages',
  'freePage.list.subtitle':
    'Wiki-style pages outside the screen hierarchy — notes, references, anything that is not a screen.',
  'freePage.list.loading': 'Loading free pages…',
  'freePage.list.loadError': 'Free pages could not be loaded.',
  'freePage.list.empty': 'No free pages yet.',
  'freePage.list.create': 'New free page',
  'freePage.list.open': 'Open',
  'freePage.list.publishableColumn': 'Publishable',
  'freePage.list.yes': 'Yes',
  'freePage.list.no': 'No',
  'freePage.create.title': 'New free page',
  'freePage.create.subtitle': 'Give it a title and a slug; the content can be filled in after.',
  'freePage.create.titleLabel': 'Title',
  'freePage.create.slugLabel': 'Slug',
  'freePage.create.submit': 'Create free page',
  'freePage.create.submitting': 'Creating…',
  'freePage.create.missingTitle': 'Enter a title.',
  'freePage.create.missingSlug': 'Enter a slug.',
  'freePage.edit.title': 'Edit free page',
  'freePage.edit.subtitle': 'Title, place in the hierarchy, publishable flag, and content.',
  'freePage.edit.titleLabel': 'Title',
  'freePage.edit.slug': 'Slug',
  'freePage.edit.parent': 'Parent free page',
  'freePage.edit.parentNone': 'No parent (top level)',
  'freePage.edit.publishable': 'Publishable',
  'freePage.edit.content': 'Content',
  'freePage.edit.save': 'Save free page',
  'freePage.edit.saved': 'Free page saved.',
  'freePage.edit.loading': 'Loading free page…',
  'freePage.edit.loadError': 'This free page could not be loaded.',
  'freePage.edit.missingTitle': 'Enter a title.',
  'freePage.edit.missingSlug': 'Enter a slug.',
  'freePage.edit.delete': 'Delete free page',
  'freePage.edit.deleteConfirm': 'Delete this free page? This cannot be undone.',
  'freePage.edit.deleted': 'Free page deleted.',

  // Tracking editor (REQ-DOM-002, REQ-DOM-008, REQ-DOM-027)
  'tracking.edit.title': 'Edit tracking',
  'tracking.edit.subtitle': 'What is measured, where it fires, and the properties it carries.',
  'tracking.edit.name': 'Name',
  'tracking.edit.slug': 'Slug',
  'tracking.edit.navigationEvent': 'Navigation event',
  'tracking.edit.eventNone': 'Choose an event',
  'tracking.edit.page': 'Page',
  'tracking.edit.pageNone': 'Not attached to a page',
  'tracking.edit.description': 'Description',
  'tracking.edit.save': 'Save tracking',
  'tracking.edit.saved': 'Tracking saved.',
  'tracking.edit.loading': 'Loading tracking…',
  'tracking.edit.loadError': 'This tracking could not be loaded.',
  'tracking.edit.missingName': 'Enter a name.',
  'tracking.edit.missingEvent': 'Choose a navigation event.',
  'tracking.edit.modules': 'Modules',
  'tracking.edit.attachModule': 'Attach module',
  'tracking.edit.moduleNone': 'Choose a module',
  'tracking.edit.attach': 'Attach',
  'tracking.edit.properties': 'Properties',
  'tracking.edit.presence': 'Presence',
  'tracking.edit.removeProperty': 'Remove property',
  'tracking.edit.moduleDetached':
    'That was the module’s last property here, so the module is no longer applied to this tracking.',
  'tracking.source.direct': 'Added directly',
  'tracking.source.module': 'From a module',
  'tracking.presence.always': 'Always',
  'tracking.presence.sometimes': 'Sometimes',
  'tracking.presence.never': 'Never',

  // Catalogue copy (REQ-DOM-019)
  'catalogue.copy.title': 'Copy from the company catalogue',
  'catalogue.copy.subtitle':
    'Selected items are copied into this project. The copies are independent — later catalogue changes do not reach them.',
  'catalogue.copy.properties': 'Catalogue properties',
  'catalogue.copy.modules': 'Catalogue modules',
  'catalogue.copy.submit': 'Copy into project',
  'catalogue.copy.nothingSelected': 'Select at least one property or module to copy.',
  'catalogue.copy.done':
    'Copied {properties} property/properties and {modules} module(s). The copies are independent and no longer linked to the catalogue.',

  // Property editor (REQ-DOM-003)
  'property.edit.title': 'Edit property',
  'property.edit.subtitle': 'What this data-layer property means, and how it must be handled.',
  'property.edit.name': 'Name',
  'property.edit.businessLabel': 'Business label',
  'property.edit.description': 'Description',
  'property.edit.type': 'Type',
  'property.edit.dataSource': 'Data source',
  'property.edit.status': 'Status',
  'property.edit.piiFlag': 'Contains personal data',
  'property.edit.hashingPolicy': 'Hashing policy',
  'property.edit.save': 'Save property',
  'property.edit.saved': 'Property saved.',
  'property.edit.missingName': 'Enter a name.',

  // Module editor (REQ-DOM-004)
  'module.edit.title': 'Edit module',
  'module.edit.subtitle': 'A reusable group of properties that trackings can attach.',
  'module.edit.name': 'Name',
  'module.edit.description': 'Description',
  'module.edit.properties': 'Properties in this module',
  'module.edit.save': 'Save module',
  'module.edit.saved': 'Module saved.',
  'module.edit.missingName': 'Enter a name.',

  // Opt-in module propagation (REQ-DOM-007)
  'module.propagate.title': 'Propagate changes to existing trackings',
  'module.propagate.explainer':
    'By default, editing this module changes only trackings created afterwards. You can push its current property set to trackings already using it — see what would change first.',
  'module.propagate.check': 'Check what would change',
  'module.propagate.affected': '{count} tracking(s) would gain properties from this module.',
  'module.propagate.now': 'Propagate now',
  'module.propagate.done': 'Propagated to {count} tracking(s).',

  // Destination editor (REQ-DOM-005)
  'destination.edit.title': 'Edit destination',
  'destination.edit.subtitle': 'Where this data is sent, and under which name.',
  'destination.edit.name': 'Name',
  'destination.edit.platform': 'Platform',
  'destination.edit.variableType': 'Variable type',
  'destination.edit.identifier': 'Identifier',
  'destination.edit.reconciliationIdentifier': 'Reconciliation identifier',
  'destination.edit.notes': 'Notes',
  'destination.edit.save': 'Save destination',
  'destination.edit.saved': 'Destination saved.',
  'destination.edit.missingFields': 'Name, platform and variable type are all required.',
  'destination.edit.missingIdentifier':
    'Enter an identifier — without one the mapping targets nothing.',

  // Tracking template editor (REQ-DOM-009)
  'template.edit.title': 'Edit tracking template',
  'template.edit.subtitle':
    'A blueprint for new trackings. Editing it does not change trackings already created from it.',
  'template.edit.name': 'Name',
  'template.edit.description': 'Description',
  'template.edit.config': 'Config (JSON)',
  'template.edit.save': 'Save template',
  'template.edit.saved': 'Template saved.',
  'template.edit.missingName': 'Enter a name.',
  'template.edit.invalidConfig': 'The config is not valid JSON.',

  // Errors surfaced from the API (REQ-NFR-010: including API error messages)
  'error.invalidCredentials': 'Invalid email or password.',
  'error.unreachable': 'Unable to reach the server. Check your connection and try again.',
  'error.unexpected': 'Something went wrong. Please try again.',
  'error.conflict':
    'Someone else changed this while you were editing. Reload to see their changes.',
  'error.staleWrite':
    'Your changes were not saved: someone else edited this record after you opened it. Your edits are still here — reload in another tab to see theirs, then save again.',
  'error.slugTaken': 'That slug is already taken. Choose another.',
  'error.inUse': 'This cannot be deleted while other records still reference it.',
  'error.forbidden': 'You do not have permission to do that.',
  'error.notFound': 'That item no longer exists.',
} as const;
