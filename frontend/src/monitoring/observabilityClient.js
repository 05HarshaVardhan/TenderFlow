import { initialize } from 'launchdarkly-js-client-sdk';
import Observability, { LDObserve } from '@launchdarkly/observability';

const clientSideId = import.meta.env.VITE_LAUNCHDARKLY_CLIENT_SIDE_ID;
const projectId = import.meta.env.VITE_LAUNCHDARKLY_OBSERVABILITY_PROJECT_ID;
const environment = import.meta.env.VITE_LAUNCHDARKLY_OBSERVABILITY_ENVIRONMENT || import.meta.env.MODE;
const serviceName = import.meta.env.VITE_LAUNCHDARKLY_OBSERVABILITY_SERVICE_NAME || 'tenderflow-frontend';
const serviceVersion = import.meta.env.VITE_LAUNCHDARKLY_OBSERVABILITY_SERVICE_VERSION;
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let initialized = false;
let ldClient = null;

export function initObservabilityClient() {
  if (!clientSideId || !projectId || initialized) return false;

  try {
    ldClient = initialize(
      clientSideId,
      { kind: 'user', key: 'anonymous', anonymous: true },
      {
        plugins: [
          new Observability({
            projectID: projectId,
            environment,
            serviceName,
            serviceVersion: serviceVersion || undefined,
            tracingOrigins: [apiBaseUrl]
          })
        ]
      }
    );
  } catch (error) {
    console.error('Observability initialization failed:', error);
    return false;
  }

  initialized = true;
  return true;
}

export function isObservabilityEnabled() {
  return Boolean(clientSideId && projectId);
}

export function identifyObservabilityUser(user) {
  if (!ldClient || !user) return;

  const identifier = user.email || user.id || user._id;
  if (!identifier) return;

  ldClient.identify({
    kind: 'user',
    key: String(identifier),
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    companyName: user.companyName,
    anonymous: false
  });
}

export { LDObserve };
