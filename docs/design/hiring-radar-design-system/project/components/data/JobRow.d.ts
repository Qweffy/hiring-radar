import * as React from 'react';
import { StatusValue } from './StatusBadge';

/**
 * A single job posting row: company, role, mono salary, location, stack tags,
 * status badges, and a match gauge. Hover glows the border.
 *
 * @startingPoint section="Data" subtitle="Job posting table row with match gauge" viewport="700x90"
 */
export interface JobRowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  company: string;
  role: string;
  /** Salary string — rendered in mono (e.g. "$180–220K"). */
  salary?: string;
  location?: string;
  /** Stack tags. */
  tags?: string[];
  /** Status badges (e.g. ['NEW','REMOTE','VISA']). */
  badges?: (StatusValue | string)[];
  /** Match score 0-100; renders a ScoreGauge. */
  score?: number;
  selected?: boolean;
  /** Amber dot — edited/stale since last sweep. */
  stale?: boolean;
  bookmarked?: boolean;
  onSelect?: () => void;
  onBookmark?: () => void;
}
export function JobRow(props: JobRowProps): JSX.Element;
