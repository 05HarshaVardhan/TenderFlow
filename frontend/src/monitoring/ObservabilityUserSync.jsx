import { useEffect } from 'react';
import { useAuth } from '@/context/authContext';
import {
  initObservabilityClient,
  isObservabilityEnabled,
  identifyObservabilityUser
} from './observabilityClient';

export default function ObservabilityUserSync() {
  const { state } = useAuth();
  const user = state?.user;

  useEffect(() => {
    initObservabilityClient();
  }, []);

  useEffect(() => {
    if (!isObservabilityEnabled() || !user) return;
    identifyObservabilityUser(user);
  }, [user?.id, user?._id, user?.email, user?.name, user?.role, user?.companyId, user?.companyName]);

  return null;
}
