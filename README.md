# Question and Answer plugin for the NodeBB registration form

A simple plugin that adds one or more questions to your registration page to help prevent spammers. Set the questions and answers in the ACP.

## Installation

    npm install nodebb-plugin-registration-question-extended

## Configuration

Go to **ACP → Plugins → Registration Question Extended** and add as many question/answer pairs as you need, then click **Save**.

- Users must answer **every question shown** correctly. Each question can have multiple valid answers; any one is accepted.
- **Random question rotation** is enabled by default. Turn it off to show questions in the configured order.
- Set **Questions per registration** to limit how many questions appear. Leave it blank to show all available questions.
- Answers are compared ignoring case, all whitespace (including internal spaces) and diacritics (accents, ñ, ü). For example, `París`, `paris`, `PARIS` and `P a r i s` are all equivalent.
- If no valid question/answer pair is configured, the registration form is not modified.

### Excluded terms

Go to **ACP → Plugins → Registration Question Extended → Excluded terms**. Enter one term per line and click **Save**. The shared list applies to both fields by default. Its two checkboxes control the shared list only; the username-only and email-only lists always apply to their respective fields.

| Use case | Configuration | Result |
|---|---|---|
| Block a recurring spam marker in either field | Add `spam` to the **Shared list** and leave both checkboxes enabled. | Blocks the username `Spam123` and the email `promo+SPAM@example.org`. |
| Apply a shared list to one field | Keep `spam` in the **Shared list**, but enable only the email checkbox. | Blocks `spam@example.org`; the shared list does not block the username `Spam123`. |
| Reserve a username fragment | Add `support` to **Usernames only**. | Blocks `ForumSupport`; this entry does not block `support@example.org`. |
| Block an email domain or address fragment | Add `@example.com` to **Email addresses only**. | Blocks `user@EXAMPLE.COM`; this entry does not check usernames. |
| Combine rules | Add `spam` to the **Shared list**, `official` to **Usernames only**, and `@example.com` to **Email addresses only**. | A match in any applicable list blocks registration. |
| Disable exclusions | Clear all three lists and save. | No registrations are blocked by excluded terms. |

Matching is case-insensitive and looks for literal text anywhere in the field. Blank lines are ignored. Domains are not matched exactly: `@example.com` also matches `user@example.com.invalid`. Short terms can match inside longer names, so use fragments specific enough for your intended rule.

These checks apply to new local registrations, even when no questions are configured or NodeBB collects the email address in a later step. Existing accounts and profile edits are unaffected. The error identifies the rejected field without showing the matching term.

## Security options

The following security options are **disabled by default** and can be enabled independently from the ACP. When only a subset of questions is shown, a signed token identifies the selected questions, even if field-name randomization is disabled.

| Option | Description |
|---|---|
| **Honeypot field** | Adds an invisible field that bots tend to fill in. A non-empty value blocks the registration. |
| **Minimum fill time** | Rejects forms submitted too quickly. Default: 3 seconds, configurable. |
| **Signed per-render token** | Randomizes input names and rejects expired or tampered forms. Tokens expire after 2 hours. |
| **Rate limiting** | Blocks an IP after a number of failed attempts. Defaults: 5 failures / 15 minutes → 15-minute lockout. |
| **Disable autocomplete** | Adds `autocomplete="off"`, `spellcheck="false"`, etc. to the answer fields. |

The plugin does not log registration attempts. Rate-limit counters are short-lived and keyed by a hashed IP.

## Storage format

Questions are stored as a JSON array in the `registration-question:questions` setting:

```json
[
	{ "question": "What is 2 + 2?", "answers": ["4", "four"] },
	{ "question": "What is the capital of France?", "answers": ["Paris"] }
]
```

## Upgrade note

Existing entries with a single `"answer"` string are still supported. The old standalone `registration-question:question` / `registration-question:answer` settings have not been used since version 3.1.0.

## Releases

`./release.sh` publishes a patch release, waits for npm to show it as `latest`, then refreshes NodeBB Package Manager and verifies that it shows the same version. Each registry has a five-minute retry window by default; set `SYNC_TIMEOUT_SECONDS` to change it.

If either registry is still catching up when the wait expires, run `./release.sh sync` from a checkout with the released version in `package.json`. This resumes registry synchronization without publishing again or touching Git tags.
