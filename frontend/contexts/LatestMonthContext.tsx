/**
 * LatestMonthContext — Global latest-month state for the SRE AgenticOps Dashboard.
 *
 * On mount, resolves the maximum YEAR_MONTH present in the dataset (via
 * resolveLatestMonth from dataService) and exposes it through React context.
 * All tabs and widgets that need to default to the latest month can consume
 * this context via the useLatestMonth() hook.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { resolveLatestMonth } from '../services/dataService';

export interface LatestMonthContextValue {
  /** Human-readable display name, e.g. "January 2026" */
  latestMonth: string;
  /** True while the async resolution is in progress */
  isResolving: boolean;
}

const LatestMonthContext = createContext<LatestMonthContextValue>({
  latestMonth: 'All Months',
  isResolving: true,
});

export const LatestMonthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [latestMonth, setLatestMonth] = useState<string>('All Months');
  const [isResolving, setIsResolving] = useState<boolean>(true);

  useEffect(() => {
    resolveLatestMonth()
      .then(month => {
        console.log('[LatestMonthContext] Resolved latest month:', month);
        setLatestMonth(month);
      })
      .catch(err => {
        console.warn('[LatestMonthContext] Resolution failed, defaulting to All Months:', err);
        setLatestMonth('All Months');
      })
      .finally(() => setIsResolving(false));
  }, []);

  return (
    <LatestMonthContext.Provider value={{ latestMonth, isResolving }}>
      {children}
    </LatestMonthContext.Provider>
  );
};

export const useLatestMonth = (): LatestMonthContextValue => useContext(LatestMonthContext);
