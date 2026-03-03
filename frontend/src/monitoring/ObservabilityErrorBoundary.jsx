import React from 'react';
import { LDObserve, isObservabilityEnabled } from './observabilityClient';

export default class ObservabilityErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    if (!isObservabilityEnabled() || !error) return;

    try {
      LDObserve.recordError(error, 'React render error', {
        componentStack: errorInfo?.componentStack || ''
      });
    } catch (captureError) {
      // Keep this silent so monitoring never breaks rendering.
      console.error('Observability capture failed:', captureError);
    }
  }

  render() {
    return this.props.children;
  }
}
