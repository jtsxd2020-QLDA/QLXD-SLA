export type Position = { lat: number; lng: number };
export type Commune = { code: string; name: string; type: string };
export type PermitInput = {
  permitNumber: string; issueDate: string; issuingAuthority: string;
  investorName: string; projectName: string; address: string; communeCode: string;
  lat: number; lng: number; area: number; floors: number;
  constructionType: 'new' | 'renovation'; notes: string;
};
export type ReportInput = {
  title: string; content: string; category: 'unlicensed' | 'wrong_permit' | 'safety' | 'other';
  reporterName: string; reporterPhone: string; address: string; communeCode: string;
  lat: number; lng: number;
};
export type Permit = PermitInput & { id: string; createdAt: string; status: 'active' };
export type CitizenReport = ReportInput & { id: string; publicCode: string; createdAt: string; status: 'received' | 'processing' | 'resolved' };
export type MapRecord = { id: string; kind: 'permit' | 'report'; title: string; subtitle: string; communeCode: string; lat: number; lng: number; status: string };
export type RecordsResponse = { permits: Permit[]; reports: CitizenReport[] };
export type ApiResult<T> = { data: T } | { error: string; fields?: Record<string, string> };
export type SessionInfo = { authenticated: boolean; mode: 'citizen'|'admin'; csrfToken?: string; email?: string };
export type PublicMapResponse = { records: MapRecord[] };
