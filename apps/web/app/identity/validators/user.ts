import { definePasswordPolicy } from '@boilerplate/validation/password-policy';
import vine from '@vinejs/vine';

/**
 * The password requirements this app enforces, shared by the signup validator
 * and the browser-side strength meter so both measure a password the same way.
 *
 * It asks for length rather than a mix of character classes: a long passphrase
 * is both stronger and easier to remember than a short password padded with a
 * digit and a symbol. The leak check in `signupValidator` catches the common
 * passwords that length alone would let through.
 *
 * `maxLength` is not a strength requirement. It bounds the work scrypt does
 * per signup, since scrypt hashes the whole input.
 */
export const passwordPolicy = definePasswordPolicy({
	minLength: 12,
	maxLength: 256,
	minScore: 2,
});

/**
 * Shared rules for email and password.
 *
 * The password carries no length rules of its own: `passwordPolicy` owns both
 * the floor and the ceiling, and reports each unmet requirement under its own
 * key so a form can mark them individually.
 */
const email = () => vine.string().email().maxLength(254);
const password = () => vine.string();

/**
 * Validator to use when performing self-signup.
 *
 * The "passwordConfirmation" field is declared explicitly, so that it is part
 * of the request body type shared with the frontend. Otherwise the signup form
 * has no way to know about the errors reported for this field.
 *
 * The password rules run cheapest first: the local policy before the leak
 * lookup, so a password that was never going to be accepted costs no network
 * round trip.
 */
export const signupValidator = vine.create({
	fullName: vine.string().nullable(),
	email: email().nonDisposable().unique({ table: 'users', column: 'email' }),
	password: password().passwordPolicy(passwordPolicy).uncompromised().confirmed({
		confirmationField: 'passwordConfirmation',
	}),
	passwordConfirmation: vine.string(),
});

/**
 * Validator to use when logging in an existing user.
 *
 * It deliberately applies none of the signup rules. An existing password has
 * to be accepted as it is, and a leak lookup on every login would add a
 * network round trip while telling an attacker nothing they could not learn
 * from the leak database themselves.
 */
export const loginValidator = vine.create({
	email: email(),
	password: vine.string(),
});
