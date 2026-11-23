/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| The validator file is used for configuring global transforms for VineJS.
| The transform below converts all VineJS date outputs from JavaScript
| Date objects to Luxon DateTime instances, so that validated dates are
| ready to use with Lucid models and other parts of the app that expect
| Luxon DateTime.
|
| It is also where the app's own validation rules are published as chainable
| schema methods, and where their error messages are registered.
|
*/

import vine, { SimpleMessagesProvider, VineDate, VineString } from '@vinejs/vine';
import { DateTime } from 'luxon';
import { nonDisposable, type NonDisposableOptions } from '#app/core/validation/rules/non_disposable';
import { enforcePasswordPolicy } from '#app/core/validation/rules/password_policy';
import { uncompromised, type UncompromisedOptions } from '#app/core/validation/rules/uncompromised';
import type { PasswordPolicy } from '@boilerplate/validation/password-policy';

declare module '@vinejs/vine/types' {
	interface VineGlobalTransforms {
		date: DateTime;
	}
}

VineDate.transform((value) => DateTime.fromJSDate(value));

/**
 * The app's rules are published as macros, the same mechanism Lucid uses for
 * `unique` and `exists`. A macro keeps the call site reading as one chain
 * (`vine.string().nonDisposable()`) instead of interrupting it with `use()`,
 * and `use()` remains available for anyone who prefers it.
 */
VineString.macro('passwordPolicy', function (this: VineString, policy: PasswordPolicy) {
	return this.use(enforcePasswordPolicy(policy));
});

VineString.macro('uncompromised', function (this: VineString, options?: UncompromisedOptions) {
	return this.use(uncompromised(options));
});

VineString.macro('nonDisposable', function (this: VineString, options?: NonDisposableOptions) {
	return this.use(nonDisposable(options));
});

declare module '@vinejs/vine' {
	interface VineString {
		/** Enforces every requirement of `policy`. @see enforcePasswordPolicy */
		passwordPolicy(policy: PasswordPolicy): this;

		/** Rejects a password found in known data leaks. @see uncompromised */
		uncompromised(options?: UncompromisedOptions): this;

		/** Rejects an address at a disposable email provider. @see nonDisposable */
		nonDisposable(options?: NonDisposableOptions): this;
	}
}

/**
 * Messages for the rules above. Every other rule keeps the message VineJS
 * ships with: `SimpleMessagesProvider` falls back to the rule's own default
 * whenever it holds no entry for the key.
 *
 * The `passwordPolicy.*` keys are per requirement rather than one combined
 * message, so a form can mark exactly which requirements are outstanding.
 */
vine.messagesProvider = new SimpleMessagesProvider({
	'uncompromisedPassword': 'This password has appeared in a data leak. Please choose a different one',
	'nonDisposableDomain': 'Disposable email addresses are not allowed',
	'passwordPolicy.minLength': 'The {{ field }} field must be at least {{ min }} characters long',
	'passwordPolicy.maxLength': 'The {{ field }} field must not be longer than {{ max }} characters',
	'passwordPolicy.letters': 'The {{ field }} field must contain at least one letter',
	'passwordPolicy.mixedCase': 'The {{ field }} field must contain both uppercase and lowercase letters',
	'passwordPolicy.numbers': 'The {{ field }} field must contain at least one number',
	'passwordPolicy.symbols': 'The {{ field }} field must contain at least one symbol',
	'passwordPolicy.minScore': 'The {{ field }} field is not strong enough',
});
