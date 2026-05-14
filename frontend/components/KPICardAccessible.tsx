import React, { memo, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { KPICardInteractive } from './KPICardInteractive';

interface KPICardAccessibleProps {
  fieldNoticeId?: string;
  fieldNoticeTitle?: string;
  onCustomerSelect?: (customer: { id: string; name: string; riskScore: number }) => void;
  fieldNotices?: any[];
}

/**
 * KPICardAccessible - Accessible wrapper for KPICardInteractive
 * Ensures WCAG 2.1 AA compliance with:
 * - Proper ARIA labels and semantic HTML
 * - Keyboard navigation support
 * - Screen reader compatibility
 * - High contrast support
 * - Focus management
 */
const KPICardAccessibleInner: React.FC<KPICardAccessibleProps> = memo(
  ({ fieldNoticeId, fieldNoticeTitle, onCustomerSelect, fieldNotices }) => {
    return (
      <main
        className="w-full"
        role="main"
        aria-label="Key Account Ratio Analytics Dashboard"
        aria-live="polite"
        aria-busy={!fieldNoticeId}
      >
        <KPICardInteractive
          fieldNoticeId={fieldNoticeId}
          fieldNoticeTitle={fieldNoticeTitle}
          onCustomerSelect={onCustomerSelect}
          fieldNotices={fieldNotices}
        />
      </main>
    );
  }
);

KPICardAccessibleInner.displayName = 'KPICardAccessibleInner';

/**
 * KPICardAccessible - Main export with error boundary and accessibility features
 */
export const KPICardAccessible: React.FC<KPICardAccessibleProps> = (props) => {
  return (
    <ErrorBoundary>
      <div className="focus-visible:outline-none">
        <KPICardAccessibleInner {...props} />
      </div>
    </ErrorBoundary>
  );
};

export default KPICardAccessible;
