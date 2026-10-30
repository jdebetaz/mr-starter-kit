export interface TeamsConfig {
	/** How long an invitation stays redeemable, in seconds. */
	invitationTtl: number;
}

const teamsConfig: Readonly<TeamsConfig> = Object.freeze<TeamsConfig>({
	invitationTtl: 7 * 24 * 60 * 60,
});

export default teamsConfig;
