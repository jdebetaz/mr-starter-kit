# Transactional email

The kit sends mail through `@adonisjs/mail` over SMTP. Messages are MJML templates rendered
by Edge, compiled to the table-based HTML that email clients actually support.

## Seeing mail locally

```bash
pnpm docker:up
```

That starts Mailpit alongside Postgres. It accepts everything on `localhost:1025`, forwards
nothing off your machine, and shows what was sent at <http://localhost:8025>. The values in
`.env.example` already point at it, so a fresh checkout sends somewhere real without an
account anywhere.

## Configuring a provider

Five variables, all required — `start/env.ts` validates them at boot, so the app will not
start until they are set:

| Variable                              | Meaning                                                               |
| ------------------------------------- | --------------------------------------------------------------------- |
| `MAIL_MAILER`                         | Which mailer in `config/mail.ts` to use. Only `smtp` ships.           |
| `SMTP_HOST`, `SMTP_PORT`              | The SMTP server. Mailpit locally; your provider's host in production. |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | The sender applied to every message that sets none.                   |

A hosted SMTP provider usually also needs credentials. `config/mail.ts` ships the `auth`
block commented out — uncomment it, and add `SMTP_USERNAME` and `SMTP_PASSWORD` to
`start/env.ts`.

For a non-SMTP provider, add a second mailer to `config/mail.ts`. `@adonisjs/mail` ships
transports for SES, Mailgun, SparkPost, Brevo, Resend, Postmark and Cloudflare; add the one
you want to the `mailers` object, extend the `MAIL_MAILER` enum in `start/env.ts`, and
point `MAIL_MAILER` at it.

Install any further AdonisJS package with `node ace configure <package>` rather than adding
the dependency by hand: the codemod writes the config file, registers the provider and
appends the env block, and a hand-written setup will be silently overwritten the next time
anyone runs it.

## Writing a message

A message is a class extending `AppMail`, living in `src/<capability>/mails/`, with its
MJML template in `resources/views/mails/`.

```ts
export default class TeamInvitationMail extends AppMail<{ teamName: string; acceptUrl: string }> {
  subject = 'You have been invited to a team';
  view = 'team_invitation';
  props = { teamName: this.team.name, acceptUrl: ... };

  textBody(): string {
    return `You have been invited to ${this.team.name}. Accept: ${this.props.acceptUrl}`;
  }
}
```

Four things the base class settles for you:

- **Recipients are `MailRecipient`, `{ email, name? }` — not `User`.** An invitation goes to
  an address that has no account yet, which is the whole point of inviting it. A caller
  holding a user passes `{ email: user.email, name: user.fullName ?? undefined }`.
- **`textBody()` is abstract, so you cannot forget the plain-text part.** HTML with no text
  alternative is scored down by spam filters and renders empty in text-only clients.
- **Do not set `from`.** Leaving it unset applies the configured sender. Set it only when a
  message genuinely must come from elsewhere.
- **A template that does not compile raises `MailTemplateInvalid`.** MJML reports a
  malformed template in its result rather than throwing, so without that check a broken
  layout would ship as partial or empty HTML.

The template composes the shared layout and uses the `mailUrl` global for links — an email
has no origin to resolve a relative `href` against:

```edge
@component('mails/layout')
  <mj-text>You have been invited to {{ teamName }}.</mj-text>
  <mj-button href="{{ mailUrl(acceptUrl) }}">Accept</mj-button>
@end
```

Edge 6 has no `@layout`/`@section` tags — components and slots replaced them — so the
layout is a component and your body arrives as its default slot.

`mailUrl` and `appName` are registered in `start/mail.ts`. The `globals` key in
`config/mail.ts` is deliberately empty: it only reaches the mailer's own view helpers, and
`AppMail` renders through Edge directly.

## Testing

The mailer is faked for every suite in `tests/bootstrap.ts`, so no test can reach a
transport — sending is something a spec would have to opt out of, never something it
forgets to prevent. The suite passes with no Mailpit running.

Messages accumulate across specs within a suite. A group that counts or inspects them calls
`captureMail(group)` from `#tests/helpers/mail` to start each test with a clean slate, then
asserts with `sentMails()` or the fake's own `assertSent`.
