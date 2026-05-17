/**
 * Admin contact data for the Contact Support modal.
 *
 * UX rationale:
 * - All admin data lives here, not in the UI component
 * - Easy to add/remove admins without touching JSX
 * - Types are co-located with the data
 */

export interface AdminContact {
  id: string;
  name: string;
  role: string;
  description?: string;
  facebookUrl: string;
  initials: string;
  /** Soft pastel background tint for the avatar placeholder */
  avatarBg: string;
}

export const ADMIN_CONTACTS: AdminContact[] = [
  {
    id: 'admin-1',
    name: 'Hoàng Văn Tài',
    role: 'System Admin',
    description: 'Handles system-level issues and account recovery',
    facebookUrl: 'https://www.facebook.com/tai.hoang.van.777946',
    initials: 'HVT',
    avatarBg: '#D9775720',
  },
  {
    id: 'admin-2',
    name: 'Nguyễn Quốc Hải',
    role: 'Community Support',
    description: 'Helps with community guidelines and user disputes',
    facebookUrl: 'https://www.facebook.com/quoc.hai.5661',
    initials: 'NQH',
    avatarBg: '#6B8F7120',
  },
  {
    id: 'admin-3',
    name: 'Trần Anh Hào',
    role: 'Technical Support',
    description: 'Resolves bugs, crashes, and technical difficulties',
    facebookUrl: 'https://www.facebook.com/curyhao123',
    initials: 'TAH',
    avatarBg: '#71809620',
  },
];
