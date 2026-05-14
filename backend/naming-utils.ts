/**
 * Standardized naming convention utilities for report exports
 * Format: ReportName_YYYYMMDD_HHMMSS
 */

export function generateTimestampedFilename(reportName: string, extension: string): string {
  const now = new Date();
  
  // Format: YYYYMMDD_HHMMSS
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
  
  // Clean the report name: remove special chars, replace spaces with underscores
  const cleanName = reportName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .trim();
  
  return `${cleanName}_${timestamp}.${extension}`;
}

export function generateReportTitle(baseTitle: string, timestamp: Date = new Date()): string {
  return `${baseTitle} - ${timestamp.toLocaleString()}`;
}

export function formatTimestamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}
