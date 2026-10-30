# MR Starter Kit domain

This glossary defines the domain language demonstrated by the boilerplate's example capabilities.

## Identity

**User**:
A person who can authenticate and use the application.

## Two-factor authentication

**Two-factor requirement**:
The rule that a user in certain roles must keep two-factor authentication on, so they cannot disable it.

**Enrollment**:
Turning two-factor authentication on. It holds a pending secret until the user proves it with a code from their authenticator app, which makes it the confirmed secret.

**Pending login**:
A sign-in whose password was verified but whose second factor is still owed. Nobody is logged in until the challenge succeeds.

**Challenge**:
The step after the password where a user with two-factor authentication proves the second factor, with an authenticator code or a recovery code.

**Recovery code**:
A single-use code that stands in for the authenticator app. Only hashes are stored, so a set is shown once, at issue.

## Teams

**Team**:
A group of users who share a workspace. It has exactly one owner, enforced by a partial
unique index rather than by convention.

**Member**:
A user's membership of one team, carrying the role they hold there. A user belongs to a
team once.

**Team role**:
What a member may do inside one team: owner, admin or member. Distinct from identity's
global **Role**, which says what a user is across the whole application — the same person
is an owner in one team and a member in another.

**Invitation**:
An offer to join a team, addressed to an email rather than to a user, because the invitee
may have no account yet. It carries a token that exists in clear only in the email.

**Workspace**:
What a request is acting in: either a personal workspace or one team. Authorization and
entitlement questions are asked of the workspace, never of the signed-in user, because a
user may hold a personal plan and belong to a paid team at the same time.

**Personal workspace**:
The workspace a user is in when no team is active. It is implicit — not a team of one.
