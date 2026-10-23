import { Callout } from './callout';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
	title: 'Atoms/Callout',
	component: Callout,
	args: {
		tone: 'info',
		children: 'Scan the QR code with your authenticator app.',
		className: 'w-96',
	},
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};
export const Warning: Story = {
	args: { tone: 'warning', title: 'Save your recovery codes', children: 'They are shown only once.' },
};
export const Danger: Story = {
	args: { tone: 'danger', title: 'Invalid code', children: 'The code is incorrect or has expired.' },
};
export const WithTitle: Story = { args: { title: 'Heads up' } };
