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
