import { Form } from '@adonisjs/inertia/react';
import { PasswordMeter } from '@boilerplate/design-system/password-meter';
import { toPasswordRulesString } from '@boilerplate/validation/password-policy';
import { useState } from 'react';
import type { Prettify } from '@adonisjs/core/types/common';
import type { PasswordPolicy } from '@boilerplate/validation/password-policy';

/**
 * `Prettify` flattens the policy into an anonymous object type. Inertia only
 * accepts JSON-shaped props, and TypeScript gives an implicit index signature
 * to object types but not to interfaces — so the interface itself would be
 * rejected at `inertia.render`. The constraint belongs to this boundary, not
 * to the shared package, which is why it is spelled out here.
 */
export default function Signup({ passwordPolicy }: { passwordPolicy: Prettify<PasswordPolicy> }) {
	const [password, setPassword] = useState('');

	/**
	 * `passwordrules` is a real HTML attribute that React's types do not know
	 * about, so it is spread in rather than written inline. It tells a password
	 * manager what to generate, so a suggested password satisfies the policy on
	 * the first try instead of being rejected after the form is submitted.
	 */
	const passwordRules = { passwordrules: toPasswordRulesString(passwordPolicy) };

	return (
		<div className="form-container">
			<div>
				<h1> Signup </h1>
				<p>Enter your details below to create your account</p>
			</div>

			<div>
				<Form route="register.execute">
					{({ errors }) => (
						<>
							<div>
								<label htmlFor="fullName">Full name</label>
								<input
									type="text"
									name="fullName"
									id="fullName"
									data-invalid={errors.fullName ? 'true' : undefined}
								/>
								{errors.fullName && <div>{errors.fullName}</div>}
							</div>

							<div>
								<label htmlFor="email">Email</label>
								<input
									type="email"
									name="email"
									id="email"
									autoComplete="email"
									data-invalid={errors.email ? 'true' : undefined}
								/>
								{errors.email && <div>{errors.email}</div>}
							</div>

							<div>
								<label htmlFor="password">Password</label>
								<input
									type="password"
									name="password"
									id="password"
									autoComplete="new-password"
									{...passwordRules}
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									data-invalid={errors.password ? 'true' : undefined}
								/>
								<PasswordMeter password={password} policy={passwordPolicy} />
								{errors.password && <div>{errors.password}</div>}
							</div>

							<div>
								<label htmlFor="passwordConfirmation">Confirm password</label>
								<input
									type="password"
									name="passwordConfirmation"
									id="passwordConfirmation"
									autoComplete="new-password"
									data-invalid={errors.passwordConfirmation ? 'true' : undefined}
								/>
								{errors.passwordConfirmation && <div>{errors.passwordConfirmation}</div>}
							</div>

							<div>
								<button type="submit" className="button">
									Sign up
								</button>
							</div>
						</>
					)}
				</Form>
			</div>
		</div>
	);
}
