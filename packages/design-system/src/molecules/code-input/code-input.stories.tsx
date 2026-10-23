import { CodeInput } from './code-input';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
	title: 'Molecules/CodeInput',
	component: CodeInput,
	args: { name: 'code' },
} satisfies Meta<typeof CodeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = { args: { invalid: true } };
export const AutoFocus: Story = { args: { autoFocus: true } };
export const EightDigits: Story = { args: { length: 8 } };
export const Disabled: Story = { args: { disabled: true, defaultValue: ['1', '2', '3'] } };
export const Prefilled: Story = { args: { defaultValue: ['1', '2', '3', '4', '5', '6'] } };
