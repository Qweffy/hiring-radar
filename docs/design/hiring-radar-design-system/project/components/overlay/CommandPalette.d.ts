import * as React from 'react';
import { IconName } from '../core/Icon';

export interface CommandItem {
  id: string;
  label: string;
  icon?: IconName;
  /** Mono shortcut/hint shown at right. */
  hint?: string;
}
export interface CommandGroup {
  label: string;
  items: CommandItem[];
}

/**
 * ⌘K command palette: glass panel, mono input, grouped + filterable results,
 * arrow-key nav, and a no-results state that falls through to posting search.
 */
export interface CommandPaletteProps {
  open: boolean;
  onClose?: () => void;
  groups: CommandGroup[];
  placeholder?: string;
  onSelect?: (item: CommandItem) => void;
  /** Called on Enter when there are no matches. */
  onSearchFallback?: (query: string) => void;
}
export function CommandPalette(props: CommandPaletteProps): JSX.Element;
