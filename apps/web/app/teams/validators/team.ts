import vine from '@vinejs/vine';

/** An absent `teamId` means the personal workspace. */
export const switchWorkspaceValidator = vine.compile(
	vine.object({
		teamId: vine.string().uuid().optional(),
	}),
);
