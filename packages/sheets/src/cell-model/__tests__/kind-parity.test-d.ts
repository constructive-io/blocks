// TYPE-LEVEL guard: SheetsCellKind must equal the frozen DisplayKind
// member-for-member. Test file → may import the harness (vitest is fine here).
// The real check is these two assignments COMPILING; there is no runtime body.

import type { DisplayKind } from '../../grid/__golden__/parity.harness';
import type { SheetsCellKind } from '../sheets-cell';

// Mutual assignability ⇒ the two unions are identical sets of string literals.
const _kindIntoDisplay: DisplayKind = '' as SheetsCellKind;
const _displayIntoKind: SheetsCellKind = '' as DisplayKind;

// Silence unused-locals without a runtime export.
export type _KindParity = [typeof _kindIntoDisplay, typeof _displayIntoKind];
