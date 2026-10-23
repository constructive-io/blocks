/**
 * Auth Pages fixtures for the break-ui stories. The worst case is what a real
 * tenant ships: a 64-character work email, a brand name written in another
 * script or with emoji, German and French copy with long compound words, error
 * messages a server writes as full paragraphs, and a 320px phone.
 */
import type { AuthNotice } from '../../components/auth-pages';
import { emails, identifiers, labels, names } from './worst-case';

type PanelCopy = { title?: string; description?: string };

export type AuthFixture = {
	/** Width of the frame the page renders in; `undefined` fills the canvas. */
	frameWidth?: number;
	/** A brand name per panel, so one pass covers every script. */
	brands: Record<'signIn' | 'signUp' | 'checkEmail' | 'verify' | 'forgot' | 'reset', string>;
	footer: string;
	email: string;
	notice?: AuthNotice;
	/** What every handler answers with when it fails. */
	failure: string;
	copy: Partial<Record<'signIn' | 'signUp' | 'forgot' | 'reset' | 'verify', PanelCopy>>;
};

export const authDemo: AuthFixture = {
	brands: { signIn: 'Acme', signUp: 'Acme', checkEmail: 'Acme', verify: 'Acme', forgot: 'Acme', reset: 'Acme' },
	footer: 'By continuing you agree to the Terms and the Privacy Policy.',
	email: 'ada@example.com',
	failure: 'That email and password do not match.',
	copy: {},
};

const LONG_BRAND = 'Northwind Industries Holdings Customer Success and Enterprise Onboarding Portal';

export const authWorst: AuthFixture = {
	frameWidth: 320,
	brands: {
		signIn: LONG_BRAND,
		signUp: `${names.emojiFirst} & Friends ${names.zwjEmoji} Studio`,
		checkEmail: 'شركة النور للاستشارات الإدارية والمالية',
		verify: '王氏集团客户关系管理平台',
		forgot: labels.german,
		reset: labels.french,
	},
	footer: `By continuing you agree to the Terms of Service, the Data Processing Addendum, and the Acceptable Use Policy of ${LONG_BRAND}. Questions: ${identifiers.url}`,
	email: emails.long,
	notice: {
		tone: 'error',
		message: `Your session for ${emails.long} ended because ${LONG_BRAND} changed its Sicherheitsrichtlinienkonfiguration. Sign in again to continue.`,
	},
	failure: `Your organization requires single sign-on for ${emails.long}. Ask an administrator at Northwind Industries Holdings to allow password sign-in in the Enterprise Security Policy, or sign in with your identity provider instead.`,
	copy: {
		signIn: {
			title: 'Anmeldung beim Kundenverwaltungsportal',
			description:
				'Verwenden Sie Ihr Benutzerkonto, um mit dieser Anwendung fortzufahren. Die Datenschutzeinstellungen und Sicherheitsrichtlinien Ihres Unternehmens gelten weiterhin.',
		},
		signUp: {
			title: 'Créer un compte professionnel pour votre organisation',
			description:
				'Inscrivez-vous avec votre adresse e-mail professionnelle et un mot de passe. Paramètres de confidentialité et de sécurité appliqués automatiquement.',
		},
		forgot: {
			title: 'Réinitialiser le mot de passe de votre compte professionnel',
			description:
				'Saisissez l’adresse e-mail associée à votre compte et nous vous enverrons un lien pour choisir un nouveau mot de passe.',
		},
		reset: {
			title: 'Neues Passwort für Ihr Unternehmenskonto festlegen',
			description: 'Legen Sie ein neues Passwort fest, um die Passwortwiederherstellungsanforderung abzuschließen.',
		},
		verify: {
			title: 'E-Mail-Adressbestätigung wird überprüft',
			description: 'Dies dauert einen Moment. Lassen Sie diese Seite geöffnet, bis die Überprüfung abgeschlossen ist.',
		},
	},
};
