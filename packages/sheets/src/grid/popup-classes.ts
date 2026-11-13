/**
 * Class names shared by the grid's own popovers and menus (toolbar popovers, the
 * header menu, the context menu).
 *
 * They open and close without motion: people open them many times a session, several
 * from a shortcut, so an entrance animation only makes them wait
 * (https://craft.gustavofior.com/hover-restraint).
 */
export const INSTANT_POPUP = 'transition-none';

/** The toolbar popovers (views, fields, sort, filters) share one inset, so their titles line up. */
export const TOOLBAR_POPOVER = `p-4 ${INSTANT_POPUP}`;
