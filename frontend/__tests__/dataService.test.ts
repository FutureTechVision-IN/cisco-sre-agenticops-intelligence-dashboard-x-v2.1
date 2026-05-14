import { fetchDashboardData } from '../frontend/services/dataService';
import { DEFAULT_FILTER_STATE } from '../frontend/types';

// Note: These tests are lightweight and use the running dev server endpoints. In CI, you'd mock fetch.

describe('DataService normalization', () => {
  test('fetchDashboardData returns DashboardData shape without throwing', async () => {
    const data = await fetchDashboardData(DEFAULT_FILTER_STATE as any);
    expect(data).toBeDefined();
    expect(data.metrics).toBeDefined();
    expect(typeof data.metrics.totalAssessed.value).toBe('number');
    expect(typeof data.metrics.vulnerable.value).toBe('number');
  }, 20000);
});
