// ─── Strike Manager & Analytics — types for the admin strike/analytics screens ───

import type { BE_ModerationStats } from "./moderation";

/**
 * Strike status of a single account.
 * Matches ModerationStrikeResultDto on the backend.
 */
export interface BE_ModerationStrikeStatus {
  userId: string;
  /** Number of active strike records (not expired, not revoked). */
  activeStrikeCount: number;
  /** Total weight of active strikes — compared against banThreshold. */
  activeStrikeWeight: number;
  /** Ban threshold currently in effect. */
  banThreshold: number;
  /** The account has exceeded the threshold. */
  shouldBeBanned: boolean;
  /** The account is currently banned. */
  isBanned: boolean;
  /** The strike system is enabled — otherwise the numbers are meaningless. */
  enabled: boolean;
}

/**
 * One strike record.
 * Matches ModerationStrikeEntryDto on the backend.
 */
export interface BE_ModerationStrikeEntry {
  id: string;
  userId: string;
  /** Id of the violating content (post / comment / reel / story). */
  targetId: string;
  /** "Post" | "Comment" | "Reel" | "Story" | "ReelComment". */
  targetType: string;
  severity: number;
  weight: number;
  /** Internal code, e.g. "admin_reject". */
  reasonCode: string;
  /** "System" (AI) or "Admin". */
  issuedBy: string;
  isRevoked: boolean;
  createdAt: string;
  /** null = never expires. */
  expiresAt: string | null;
}

/**
 * An account that is accumulating strikes — the row model of the Strike Manager.
 * Matches ModerationStrikeUserDto on the backend.
 */
export interface BE_ModerationStrikeUser {
  userId: string;
  displayName: string;
  avatarUrl: string;
  activeStrikeCount: number;
  activeStrikeWeight: number;
  banThreshold: number;
  shouldBeBanned: boolean;
  isBanned: boolean;
  lastViolationAt: string | null;
  latestStrike: BE_ModerationStrikeEntry | null;
}

/**
 * One data point on the daily moderation volume chart.
 */
export interface BE_ModerationDailyPoint {
  /** yyyy-MM-dd */
  date: string;
  total: number;
  approved: number;
  rejected: number;
  needsReview: number;
  pending: number;
}

/**
 * One row of a distribution breakdown (target type / category / source).
 */
export interface BE_ModerationBreakdown {
  key: string;
  count: number;
  /** 0–100 */
  percentage: number;
}

/**
 * AI ↔ admin agreement, from GET /post/moderation/agreement.
 */
export interface BE_ModerationAgreement {
  reviewedCount: number;
  falseNegativeCount: number;
  falsePositiveCount: number;
  disagreementRate: number;
  agreementRate: number;
  estimatedAccuracy: number;
  byCategory: {
    category: string;
    reviewedCount: number;
    disagreementCount: number;
    agreementRate: number;
  }[];
  byPromptVersion: {
    key: string;
    totalCount: number;
    approvedCount: number;
    rejectedCount: number;
    needsReviewCount: number;
    autoApproveRatio: number;
  }[];
  byModel: {
    key: string;
    totalCount: number;
    approvedCount: number;
    rejectedCount: number;
    needsReviewCount: number;
    autoApproveRatio: number;
  }[];
  suggestedThresholds: {
    approveMinConfidence: number;
    rejectMinConfidence: number;
    sampleSize: number;
    explanation: string;
  } | null;
}

/**
 * Everything the admin dashboard needs in one request.
 * Matches ModerationAnalyticsDto on the backend.
 */
export interface BE_ModerationAnalytics {
  days: number;
  summary: BE_ModerationStats;
  daily: BE_ModerationDailyPoint[];
  byTargetType: BE_ModerationBreakdown[];
  byCategory: BE_ModerationBreakdown[];
  bySource: BE_ModerationBreakdown[];
  agreement: BE_ModerationAgreement;
  /** Average LLM latency in milliseconds. */
  averageLatencyMs: number;
  /** Average confidence of LLM decisions (0–1). */
  averageConfidence: number;
  /** Estimated LLM cost in USD over the window. */
  totalCostUsd: number;
  /** Accounts currently over the strike threshold (not yet banned). */
  usersOverStrikeThreshold: number;
}
