# Question and Answer plugin for the NodeBB registration form

A simple plugin that adds one or more questions to your registration page to help prevent spammers. Set the questions and answers in the ACP.

## Installation

    npm install nodebb-plugin-registration-question-extended

## Configuration

Go to **ACP → Plugins → Registration Question** and add as many question/answer pairs as you need, then click **Save**.

- Users must answer **all** questions correctly to register.
- Questions are displayed in a **random order** on every load of the registration page.
- Answers are compared ignoring case and leading/trailing whitespace.
- If no valid question/answer pair is configured, the registration form is not modified.

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
