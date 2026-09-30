import { AppleHealthService } from './AppleHealthService';
import { DemoHealthService } from './DemoHealthService';
import type { HealthService, HealthSourceKind } from './HealthService';

export * from './HealthService';

const services: Partial<Record<HealthSourceKind, HealthService>> = {};

/** One instance per source, so the demo heart rate keeps its random walk between polls. */
export function getHealthService(kind: HealthSourceKind): HealthService {
  let svc = services[kind];
  if (!svc) {
    svc = kind === 'apple' ? new AppleHealthService() : new DemoHealthService();
    services[kind] = svc;
  }
  return svc;
}
