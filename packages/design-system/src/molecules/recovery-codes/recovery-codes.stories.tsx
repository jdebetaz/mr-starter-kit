import { RecoveryCodes } from './recovery-codes';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
	title: 'Molecules/RecoveryCodes',
	component: RecoveryCodes,
	args: {
		codes: [
			'a1b2c-d3e4f',
			'g5h6i-j7k8l',
			'm9n0p-q1r2s',
			't3u4v-w5x6y',
			'z7a8b-c9d0e',
			'f1g2h-i3j4k',
			'l5m6n-o7p8q',
			'r9s0t-u1v2w',
		],
	},
} satisfies Meta<typeof RecoveryCodes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Few: Story = { args: { codes: ['a1b2c-d3e4f', 'g5h6i-j7k8l'] } };
