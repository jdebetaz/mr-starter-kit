import { definePasswordPolicy } from '@boilerplate/validation/password-policy';
import { PasswordMeter } from './password-meter';
import type { Meta, StoryObj } from '@storybook/react-vite';

/** The policy the application enforces at signup. */
const appPolicy = definePasswordPolicy({ minLength: 12, maxLength: 256, minScore: 3 });

const meta = {
	title: 'Molecules/PasswordMeter',
	component: PasswordMeter,
	args: {
		policy: appPolicy,
		password: '',
		className: 'w-80',
	},
} satisfies Meta<typeof PasswordMeter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing typed yet: no verdict, and every requirement still outstanding. */
export const Empty: Story = {};

export const Weak: Story = { args: { password: 'secret' } };

export const Fair: Story = { args: { password: 'correct horse' } };

export const Strong: Story = { args: { password: 'correct horse battery staple' } };

/** A password that is strong but too long for the policy's ceiling. */
export const TooLong: Story = {
	args: {
		policy: definePasswordPolicy({ minLength: 12, maxLength: 24, minScore: 3 }),
		password: 'correct horse battery staple and then some',
	},
};

/**
 * A policy that asks for every character class, which is the longest the
 * checklist ever gets.
 */
export const EveryRequirement: Story = {
	args: {
		policy: definePasswordPolicy({
			minLength: 16,
			maxLength: 128,
			letters: true,
			mixedCase: true,
			numbers: true,
			symbols: true,
			minScore: 4,
		}),
		password: 'Tr0ub4dour',
	},
};
