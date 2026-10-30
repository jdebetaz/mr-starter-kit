import { inject } from '@adonisjs/core';
import TeamRepository from '#teams/repositories/team_repository';
import { ActiveWorkspace } from '#teams/services/active_workspace';
import type { TeamRole } from '#teams/domain/team_role';
import type { Workspace } from '#teams/types/team';
import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';

/**
 * Resolves the workspace every request acts in and puts it on the context.
 *
 * The session only holds a team id. It is re-resolved against the membership
 * table on every request, so an id that no longer matches a membership — the
 * user was removed, or the team was deleted — degrades to the personal
 * workspace rather than granting access to a team they have left.
 */
@inject()
export default class WorkspaceMiddleware {
	constructor(private readonly teamRepository: TeamRepository) {}

	async handle(ctx: HttpContext, next: NextFn) {
		ctx.workspace = await this.#resolve(ctx);

		return next();
	}

	async #resolve(ctx: HttpContext): Promise<Workspace | undefined> {
		const user = ctx.auth?.user;

		if (!user) {
			return undefined;
		}

		const teamId = ActiveWorkspace.read(ctx.session);

		if (!teamId) {
			return { kind: 'personal', user };
		}

		const membership = await this.teamRepository.membershipFor(teamId, user.id);

		if (!membership) {
			ActiveWorkspace.clear(ctx.session);

			return { kind: 'personal', user };
		}

		const team = await this.teamRepository.findById(teamId);

		if (!team) {
			ActiveWorkspace.clear(ctx.session);

			return { kind: 'personal', user };
		}

		/** SAFETY: the role column is only ever written from `TeamRole`. */
		return { kind: 'team', team, role: membership.role as TeamRole };
	}
}

declare module '@adonisjs/core/http' {
	interface HttpContext {
		/** Undefined on an unauthenticated request. */
		workspace?: Workspace;
	}
}
