# Teams and workspaces

A **team** is a group of users who share a workspace. A **workspace** is what a request is
acting in: either a user's personal workspace or one team.

## Authorization takes a workspace, not a user

The same person is an owner in one team and a member in another, and may hold a personal
plan while belonging to a paid team. So every authorization question — and, once billing
lands, every entitlement question — takes the `Workspace` from `#teams/types/team`, never
the signed-in `User`:

```ts
export type Workspace = { kind: 'personal'; user: User } | { kind: 'team'; team: Team; role: TeamRole };
```

`app/teams/policies/team_policy.ts` is a plain object of predicates over it. It is
deliberately not a Bouncer policy: Bouncer keys policies to a user, which would mean
re-deriving the workspace from the user — the exact mistake this design exists to prevent.

## How the active workspace is carried

The session holds only a team id, written by `POST /workspace/switch`. On **every**
request, `app/teams/middleware/workspace_middleware.ts` re-resolves that id against the
membership table and sets `ctx.workspace`.

Re-resolving per request is the point. A membership can be revoked between two requests,
so an id that no longer matches one degrades to the personal workspace rather than keeping
access to a team the user has left. The switch endpoint itself checks membership before
writing the id — without that check it would be a one-request takeover.

Known limitation: two browser tabs share one session, so switching in one changes the
other. Moving the workspace into a URL segment would fix that, and is the upgrade path.

## One owner per team

`team_members` carries a partial unique index:

```sql
CREATE UNIQUE INDEX team_members_one_owner_per_team ON team_members (team_id) WHERE role = 'owner'
```

The Actions check first and return a typed `would_leave_team_ownerless` error, but the
index is what makes the rule true under a race. Consequences:

- the only owner cannot be demoted or removed;
- `TransferOwnership` demotes the outgoing owner to admin and promotes the successor in one
  transaction, old owner first, because the index permits only one at a time;
- `teams.owner_id` is `ON DELETE RESTRICT`, so deleting a user who owns a team fails loudly.

## The invitation lifecycle

An invitation is addressed to an **email**, not a user: the invitee may have no account.
Its token is issued by `DbAccessTokensProvider.forModel(TeamInvitation)`, which owns
generation, hashing and expiry — the invitation row holds no secret, and nothing in the
database can reconstruct the link.

`AcceptInvitation` refuses in three ways:

| Error              | When                                                  |
| ------------------ | ----------------------------------------------------- |
| `not_found`        | unknown, expired, or revoked token                    |
| `already_accepted` | the invitation has already been redeemed              |
| `wrong_recipient`  | the signed-in user's email is not the invited address |

`not_found` deliberately covers three cases: the token provider cannot distinguish unknown
from expired, revocation deletes the row, and collapsing them tells a guesser nothing about
whether a token ever existed.

`wrong_recipient` matters because the link is a bearer token sitting in an inbox. Without
it, anyone who obtained the email could join as themselves.

A second pending invitation to the same address is refused by the Action and, under a race,
by a second partial unique index on `(team_id, email) WHERE accepted_at IS NULL`.

## Adding a named route

`.adonisjs/server/routes.d.ts`, which types route names, is regenerated **only** by
`node ace serve --hmr` — not by `node ace test` or `node ace build`. A new named route
therefore needs the dev server run once before `toRoute('...')` typechecks.
