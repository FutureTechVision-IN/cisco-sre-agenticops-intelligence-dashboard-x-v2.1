// Search-related type definitions

export interface SearchResult {
  fieldNotice: string;
  fieldNoticeFormatted: string;
  customerName: string;
  normalizedCustomer: string;
  fnType: string;
  fnTypeCategory: string;
  month: string;
  year: string;
  totVuln: number;
  potVuln: number;
  notVuln: number;
  cpyKey: string;
  dateImported: string;
}

export interface SearchFilters {
  customerName: string;
  fieldNotice: string;
  fnType: string;
  month: string;
  showOnlyVulnerable: boolean;
}

export interface SearchState {
  isLoading: boolean;
  error: string | null;
  results: SearchResult[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  sortField: string;
  sortOrder: 'asc' | 'desc';
}

export interface FieldNoticeCategory {
  type: string;
  count: number;
  color: string;
}

export interface SearchOptions {
  customers: string[];
  fieldNotices: string[];
  months: string[];
  fnTypes: FieldNoticeCategory[];
}

export interface SearchApiResponse {
  results: SearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    customer?: string;
    fieldNotice?: string;
    fnType?: string;
    month?: string;
    onlyVulnerable?: boolean;
  };
}
