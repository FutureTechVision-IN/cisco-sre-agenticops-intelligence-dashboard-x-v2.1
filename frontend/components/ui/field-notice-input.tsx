/**
 * Field Notice Input Component
 * ============================
 * 
 * Reusable input component for Field Notice IDs with built-in validation.
 * Provides real-time feedback and auto-formatting.
 * 
 * @module components/ui/field-notice-input
 * @version 1.0.0
 */

import React, { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';
import { useFieldNoticeValidation } from '@/hooks/useFieldNoticeValidation';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface FieldNoticeInputProps {
  /** Current value */
  value?: string;
  /** Change handler - receives formatted value and validity */
  onChange?: (value: string, isValid: boolean) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Input placeholder */
  placeholder?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the input */
  inputClassName?: string;
  /** Label text */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Custom ID for the input */
  id?: string;
  /** Whether to show validation status icon */
  showStatusIcon?: boolean;
  /** Whether to show helper text with format info */
  showHelperText?: boolean;
  /** Whether to auto-format on blur */
  autoFormat?: boolean;
  /** Error message to display (overrides validation error) */
  error?: string;
  /** Name attribute for forms */
  name?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FieldNoticeInput = forwardRef<HTMLInputElement, FieldNoticeInputProps>(
  (
    {
      value: controlledValue,
      onChange,
      onBlur,
      placeholder = 'FN12345',
      className,
      inputClassName,
      label,
      required = false,
      disabled = false,
      id: providedId,
      showStatusIcon = true,
      showHelperText = true,
      autoFormat = true,
      error: externalError,
      name,
      size = 'md',
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = providedId || generatedId;

    const {
      value: internalValue,
      setValue,
      isValid,
      errorMessage: validationError,
      handleBlur: internalHandleBlur,
      isTouched,
      formattedId,
    } = useFieldNoticeValidation({
      initialValue: controlledValue || '',
      autoFormat,
      onChange: (val, valid) => {
        onChange?.(val, valid);
      },
    });

    // Use controlled value if provided, otherwise internal state
    const displayValue = controlledValue !== undefined ? controlledValue : internalValue;
    const errorMessage = externalError || validationError;
    const showError = (isTouched || externalError) && errorMessage;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value.toUpperCase();
      setValue(newValue);
    };

    const handleBlur = () => {
      internalHandleBlur();
      onBlur?.();
    };

    // Size classes
    const sizeClasses = {
      sm: 'h-8 text-xs px-2',
      md: 'h-10 text-sm px-3',
      lg: 'h-12 text-base px-4',
    };

    // Status icon
    const StatusIcon = () => {
      if (!showStatusIcon || !isTouched || !displayValue) return null;

      if (isValid) {
        return (
          <CheckCircle2 
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" 
            aria-hidden="true"
          />
        );
      }

      return (
        <AlertCircle 
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" 
          aria-hidden="true"
        />
      );
    };

    return (
      <div className={cn('space-y-1.5', className)}>
        {/* Label */}
        {label && (
          <label 
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          <input
            ref={ref}
            type="text"
            id={inputId}
            name={name}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            maxLength={7} // FN + 5 digits
            aria-invalid={showError ? 'true' : 'false'}
            aria-describedby={showError ? `${inputId}-error` : showHelperText ? `${inputId}-helper` : undefined}
            className={cn(
              // Base styles
              'w-full rounded-md border font-mono tracking-wider',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-1',
              // Size
              sizeClasses[size],
              // Status styles
              showError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50 dark:bg-red-900/10'
                : isValid && isTouched && displayValue
                ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20 bg-white dark:bg-gray-800',
              // Disabled
              disabled && 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900',
              // Status icon padding
              showStatusIcon && 'pr-10',
              inputClassName
            )}
          />
          <StatusIcon />
        </div>

        {/* Error Message */}
        {showError && (
          <p 
            id={`${inputId}-error`}
            className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3" />
            {errorMessage}
          </p>
        )}

        {/* Helper Text */}
        {showHelperText && !showError && (
          <p 
            id={`${inputId}-helper`}
            className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            Format: FN + 5 digits (e.g., FN12345)
          </p>
        )}

        {/* Formatted Value Hint */}
        {isTouched && formattedId && formattedId !== displayValue && isValid && (
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Will be saved as: {formattedId}
          </p>
        )}
      </div>
    );
  }
);

FieldNoticeInput.displayName = 'FieldNoticeInput';

// ============================================================================
// SIMPLE VALIDATION DISPLAY COMPONENT
// ============================================================================

export interface FieldNoticeValidationBadgeProps {
  fieldNoticeId: string | null | undefined;
  showFormatted?: boolean;
  className?: string;
}

/**
 * Simple badge to display validation status of a Field Notice ID
 */
export const FieldNoticeValidationBadge: React.FC<FieldNoticeValidationBadgeProps> = ({
  fieldNoticeId,
  showFormatted = false,
  className,
}) => {
  const { isValid, formattedId } = useFieldNoticeValidation({
    initialValue: fieldNoticeId || '',
  });

  if (!fieldNoticeId) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-gray-400', className)}>
        <AlertCircle className="h-3 w-3" />
        No ID
      </span>
    );
  }

  if (isValid) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-green-600', className)}>
        <CheckCircle2 className="h-3 w-3" />
        {showFormatted ? formattedId : fieldNoticeId}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-red-600', className)}>
      <AlertCircle className="h-3 w-3" />
      Invalid: {fieldNoticeId}
    </span>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default FieldNoticeInput;
