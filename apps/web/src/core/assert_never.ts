/**
 * Exhaustiveness guard for `switch` statements over a union: the call only
 * type-checks once every variant is handled, and throws if an unexpected
 * value still arrives at runtime.
 */
export function assertNever(value: never): never {
	throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
