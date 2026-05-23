// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ReportReason {
  Spam = 'Spam',
  HarassmentOrBullying = 'Harassment or Bullying',
  HateSpeech = 'Hate Speech',
  ViolenceOrDangerousOrg = 'Violence or Dangerous Organization',
  SexualContent = 'Sexual Content',
  Misinformation = 'Misinformation',
  IntellectualProperty = 'Intellectual Property Violation',
  SelfHarm = 'Self-Harm or Suicide',
  ChildSafety = 'Child Safety Concern',
  Other = 'Other',
}

export enum ReportStatus {
  Pending = 'Pending',
  Resolved = 'Resolved',
  Dismissed = 'Dismissed',
}

export enum UserStatus {
  Active = 'Active',
  Warned = 'Warned',
  Blocked = 'Blocked',
  Banned = 'Banned',
}

// ─── Reporter Info ────────────────────────────────────────────────────────────

export interface ReporterInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  reportedAt: string; // ISO 8601
  reason: ReportReason;
  additionalDetails: string | null;
}

// ─── Reported User Summary (for list) ─────────────────────────────────────────

export interface ReportedUserSummary {
  reportedUserId: string;
  displayName: string;
  avatarUrl: string | null;
  userStatus: UserStatus;
  totalReportCount: number;
  pendingReportCount: number;
  mostCommonReason: ReportReason;
  latestReportAt: string; // ISO 8601
  recentReporters: ReporterInfo[];
}

// ─── Full Report Entry (for detail view) ──────────────────────────────────────

export interface ReportEntry {
  id: string;
  reporterId: string;
  reporterDisplayName: string;
  reporterAvatarUrl: string | null;
  reportedAt: string; // ISO 8601
  reason: ReportReason;
  additionalDetails: string | null;
  status: ReportStatus;
}

// ─── Reported User Detail ─────────────────────────────────────────────────────

export interface ReportedUserDetail {
  reportedUserId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  userStatus: UserStatus;
  joinedAt: string;
  totalReportCount: number;
  reports: ReportEntry[];
}

// ─── API Request / Response ───────────────────────────────────────────────────

export interface GetReportsParams {
  skip?: number;
  take?: number;
  status?: ReportStatus;
}

export interface ResolveReportsParams {
  userId: string;
  action: AdminAction;
  reason?: string;
}

export enum AdminAction {
  WarnUser = 'warn',
  BlockUser = 'block',
  BanUser = 'ban',
  IgnoreReports = 'dismiss',
}

export interface AdminActionResult {
  success: boolean;
  message: string;
  userStatus?: UserStatus;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedReportsResponse {
  items: ReportedUserSummary[];
  totalCount: number;
  skip: number;
  take: number;
  hasMore: boolean;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface AdminReportStats {
  totalPending: number;
  totalResolved: number;
  totalDismissed: number;
  topReasons: Array<{ reason: ReportReason; count: number }>;
}
