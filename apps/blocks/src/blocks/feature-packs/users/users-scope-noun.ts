import * as React from 'react';

/**
 * What the members belong to, in words: the application by default, or an
 * entity such as an organization or a data room. `short` names a role
 * ("app admin"); `long` names the thing ("application members").
 */
export type UsersScopeNoun = Readonly<{ short: string; long: string }>;

export const APP_NOUN: UsersScopeNoun = { short: 'app', long: 'application' };

export const UsersNounContext = React.createContext<UsersScopeNoun>(APP_NOUN);

export const useUsersNoun = () => React.useContext(UsersNounContext);

/** `organization` → `Organization`. */
export const capitalized = (text: string) => text[0]!.toUpperCase() + text.slice(1);

/** `organization` → `an organization`. */
export const articled = (word: string) => `${/^[aeiou]/iu.test(word) ? 'an' : 'a'} ${word}`;
