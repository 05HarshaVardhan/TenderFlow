let LDObserve = null;
let Handlers = null;
let initLDClient = null;
let Observability = null;
let monitoringEnabled = false;
let monitoringConfig = null;

const LAUNCHDARKLY_SDK_KEY = process.env.LAUNCHDARKLY_SDK_KEY || '';
const LAUNCHDARKLY_SERVICE_NAME = process.env.LAUNCHDARKLY_SERVICE_NAME || 'tenderflow-backend';
const LAUNCHDARKLY_SERVICE_VERSION = process.env.LAUNCHDARKLY_SERVICE_VERSION || '';
const LAUNCHDARKLY_ENVIRONMENT = process.env.LAUNCHDARKLY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const LAUNCHDARKLY_OTLP_ENDPOINT = process.env.LAUNCHDARKLY_OTLP_ENDPOINT || '';
const LAUNCHDARKLY_BACKEND_URL = process.env.LAUNCHDARKLY_BACKEND_URL || '';

const noopMiddleware = (req, res, next) => next();

function getMonitoringConfig() {
  return {
    serviceName: LAUNCHDARKLY_SERVICE_NAME,
    serviceVersion: LAUNCHDARKLY_SERVICE_VERSION || undefined,
    environment: LAUNCHDARKLY_ENVIRONMENT,
    ...(LAUNCHDARKLY_OTLP_ENDPOINT ? { otlpEndpoint: LAUNCHDARKLY_OTLP_ENDPOINT } : {}),
    ...(LAUNCHDARKLY_BACKEND_URL ? { backendUrl: LAUNCHDARKLY_BACKEND_URL } : {})
  };
}

function initMonitoring() {
  if (monitoringEnabled) {
    return true;
  }

  if (!LAUNCHDARKLY_SDK_KEY) {
    console.log('[Monitoring] LaunchDarkly Observability disabled (missing LAUNCHDARKLY_SDK_KEY)');
    return false;
  }

  try {
    const ld = require('@launchdarkly/node-server-sdk');
    const o11y = require('@launchdarkly/observability-node');

    initLDClient = ld.init;
    Observability = o11y.Observability;
    LDObserve = o11y.LDObserve;
    Handlers = o11y.Handlers;
  } catch (error) {
    console.warn(
      '[Monitoring] LaunchDarkly packages missing. Run: npm i @launchdarkly/node-server-sdk @launchdarkly/observability-node'
    );
    return false;
  }

  try {
    monitoringConfig = getMonitoringConfig();
    const client = initLDClient(LAUNCHDARKLY_SDK_KEY, {
      plugins: [new Observability(monitoringConfig)]
    });

    if (client?.waitForInitialization) {
      client
        .waitForInitialization(10)
        .then(() => {
          console.log(`[Monitoring] LaunchDarkly Observability enabled (${LAUNCHDARKLY_ENVIRONMENT})`);
        })
        .catch((error) => {
          console.error('[Monitoring] LaunchDarkly initialization timed out/failed:', error.message);
        });
    }

    monitoringEnabled = true;
    return true;
  } catch (error) {
    console.error('[Monitoring] Failed to initialize LaunchDarkly Observability:', error.message);
    monitoringEnabled = false;
    return false;
  }
}

function captureException(error, context = {}) {
  if (!monitoringEnabled || !LDObserve || !error) return;
  try {
    LDObserve.recordError(error, undefined, undefined, context);
  } catch (captureError) {
    console.error('[Monitoring] Failed to send exception to LaunchDarkly:', captureError.message);
  }
}

function captureMessage(message, level = 'info', context = {}) {
  if (!monitoringEnabled || !LDObserve) return;
  try {
    LDObserve.recordLog(message, level, undefined, undefined, context);
  } catch (captureError) {
    console.error('[Monitoring] Failed to send log to LaunchDarkly:', captureError.message);
  }
}

function getMonitoringMiddleware() {
  if (!monitoringEnabled || !Handlers?.middleware) return noopMiddleware;
  return Handlers.middleware();
}

function getMonitoringErrorHandler() {
  if (!monitoringEnabled || !Handlers?.errorHandler || !monitoringConfig) return null;
  return Handlers.errorHandler(monitoringConfig);
}

function isMonitoringEnabled() {
  return monitoringEnabled;
}

function getMonitoringProvider() {
  return monitoringEnabled ? 'launchdarkly' : 'none';
}

module.exports = {
  initMonitoring,
  captureException,
  captureMessage,
  getMonitoringMiddleware,
  getMonitoringErrorHandler,
  isMonitoringEnabled,
  getMonitoringProvider
};
