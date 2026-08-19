/**
 * General-purpose import-script template (REQ-IMP-007, ADR-0021).
 *
 * Copy this file for a product-specific import. It intentionally contains no
 * source-system parser and no credentials. The script should call the public
 * API with a service-account token and stable custom_id values.
 */

interface ImportConfig {
  apiBaseUrl: string;
  companyId: string;
  projectId: string;
  serviceToken: string;
}

function loadConfig(): ImportConfig {
  const values = {
    apiBaseUrl: process.env.DXDOC_API_URL,
    companyId: process.env.DXDOC_COMPANY_ID,
    projectId: process.env.DXDOC_PROJECT_ID,
    serviceToken: process.env.DXDOC_SERVICE_TOKEN,
  };
  const missing = Object.entries(values)
    .filter(([, value]) => value === undefined || value === '')
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing import configuration: ${missing.join(', ')}`);
  }
  const required = (value: string | undefined, name: string): string => {
    if (value === undefined || value === '')
      throw new Error(`Missing import configuration: ${name}`);
    return value;
  };
  return {
    apiBaseUrl: required(values.apiBaseUrl, 'apiBaseUrl'),
    companyId: required(values.companyId, 'companyId'),
    projectId: required(values.projectId, 'projectId'),
    serviceToken: required(values.serviceToken, 'serviceToken'),
  };
}

async function request(
  config: ImportConfig,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${config.serviceToken}`);
  headers.set('content-type', 'application/json');
  const response = await fetch(`${config.apiBaseUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers,
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(`Import request failed (${String(response.status)}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function main(): Promise<void> {
  const config = loadConfig();
  // Replace this example with reviewed source-to-API mapping code.
  await request(
    config,
    `/api/companies/${config.companyId}/projects/${config.projectId}/reconciliation`,
  );
}

void main();
