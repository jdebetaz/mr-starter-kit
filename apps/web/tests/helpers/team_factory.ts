import CreateTeam from '#teams/actions/create_team';
import TeamRepository from '#teams/repositories/team_repository';
import { createUser } from '#tests/helpers/user_factory';
import type User from '#identity/models/user';
import type Team from '#teams/models/team';

interface TeamAttributes {
	owner?: User;
	name?: string;
}

/** Persists a team with its owner's membership, mirroring `createUser`. */
export async function createTeam({ owner, name }: TeamAttributes = {}): Promise<{ team: Team; owner: User }> {
	const teamOwner = owner ?? (await createUser());
	const action = new CreateTeam(new TeamRepository());
	const result = await action.execute({ name: name ?? `Team ${crypto.randomUUID()}`, owner: teamOwner });

	if (!result.ok) {
		throw new Error(`createTeam: ${result.error.type}`);
	}

	return { team: result.value, owner: teamOwner };
}
