# Question and Answer plugin for the NodeBB registration form

A simple plugin that adds one or more questions to your registration page to help prevent spammers. Set the questions and answers in the ACP.

## Installation

    npm install nodebb-plugin-registration-question-extended

## Configuration

Go to **ACP → Plugins → Registration Question Extended** and add as many question/answer pairs as you need, then click **Save**.

- Users must answer **all** questions correctly to register.
- Questions are displayed in a **random order** on every load of the registration page.
- Answers are compared ignoring case, all whitespace (including internal spaces) and diacritics (accents, ñ, ü). For example, `París`, `paris`, `PARIS` and `P a r i s` are all equivalent.
- If no valid question/answer pair is configured, the registration form is not modified.

## Security options

All security layers are **disabled by default** and can be enabled independently from the ACP:

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
	{ "question": "What is 2 + 2?", "answer": "4" },
	{ "question": "What is the capital of France?", "answer": "Paris" }
]
```

## Upgrade note

Since version 3.1.0 the plugin only reads the multi-question format above. The old `registration-question:question` / `registration-question:answer` settings are no longer used; re-enter your questions in the ACP after upgrading.
