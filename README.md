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
