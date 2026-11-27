"use strict";

const plugin = module.exports;
const meta = nodebb.require('./src/meta');
const helpers = nodebb.require('./src/helpers');
const crypto = nodebb.require('crypto');
const nconf = nodebb.require('nconf');
const db = nodebb.require('./src/database');

const CONFIG_KEY = 'registration-question:questions';
const EXCLUDED_TERMS_KEY = 'registration-question:excluded-terms';
const ROTATION_KEY = 'registration-question:rotation';
const QUESTION_COUNT_KEY = 'registration-question:question-count';
const INPUT_PREFIX = 'registration-question-';
const SECURITY_PREFIX = 'registration-question:security:';
const HONEYPOT_FIELD = 'registration-question-website';
const TOKEN_FIELD = 'registration-question-token';
const STARTED_FIELD = 'registration-question-started';
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

function getQuestions() {
	let parsed;
	const raw = meta.config[CONFIG_KEY];

	try {
		parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
	} catch (err) {
		parsed = [];
	}

	if (!Array.isArray(parsed)) {
		return [];
	}

	return parsed.reduce((questions, item, index) => {
		const question = item && typeof item.question === 'string' ? item.question.trim() : '';
		const alternatives = Array.isArray(item?.answers) ? item.answers : [item?.answer];
		const answers = alternatives.filter(answer => typeof answer === 'string')
			.map(normalizeAnswer).filter(Boolean);

		if (question && answers.length) {
			questions.push({ index, question, answers });
		}

		return questions;
	}, []);
}

function questionCount(total) {
	const count = Number(meta.config[QUESTION_COUNT_KEY]);
	return Number.isSafeInteger(count) && count > 0 ? Math.min(count, total) : total;
}

function rotationEnabled() {
	const value = meta.config[ROTATION_KEY] ?? 1;
	return value === true || String(value) === '1';
}

function shuffle(array) {
	for (let i = array.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function normalizeAnswer(value) {
	return String(value || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\s+/g, '')
		.toLowerCase();
}

function getExcludedTerms() {
	try {
		return JSON.parse(meta.config[EXCLUDED_TERMS_KEY] || '{}') || {};
	} catch (err) {
		return {};
	}
}

function containsExcludedTerm(field, value, settings) {
	if (typeof value !== 'string' || !value) {
		return false;
	}

	const normalized = value.normalize().toLowerCase();
	const useCommon = field === 'username' ? settings.commonUsername : settings.commonEmail;
	const lists = useCommon === false ? [settings[field]] : [settings[field], settings.common];

	return lists.some(list => typeof list === 'string' && list.split(/\r\n?|\n/).some((line) => {
		const term = line.trim().normalize().toLowerCase();
		return term && normalized.includes(term);
	}));
}

function isEnabled(name) {
	const value = meta.config[`${SECURITY_PREFIX}${name}`];
	return value === 1 || value === true || String(value) === '1';
}

function getInt(name, defaultValue, min, max) {
	const parsed = parseInt(meta.config[`${SECURITY_PREFIX}${name}`], 10);
	const value = Number.isFinite(parsed) ? parsed : defaultValue;
	return Math.min(max, Math.max(min, value));
}

function getSecret() {
	return String(nconf.get('secret') || 'nodebb-registration-question');
}

function toBase64Url(value) {
	return Buffer.from(value).toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function fromBase64Url(value) {
	const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
	return Buffer.from(normalized, 'base64').toString('utf8');
}

function sign(payload) {
	const data = toBase64Url(JSON.stringify(payload));
	const signature = toBase64Url(crypto.createHmac('sha256', getSecret()).update(data).digest());
	return `${data}.${signature}`;
}

function verify(token) {
	if (typeof token !== 'string') {
		return null;
	}

	const parts = token.split('.');
	if (parts.length !== 2) {
		return null;
	}

	const [data, signature] = parts;
	const expected = toBase64Url(crypto.createHmac('sha256', getSecret()).update(data).digest());
	const given = Buffer.from(signature);
	const wanted = Buffer.from(expected);

	if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
		return null;
	}

	try {
		return JSON.parse(fromBase64Url(data));
	} catch (err) {
		return null;
	}
}

function randomInputId(used) {
	let id;
	do {
		id = `rq_${crypto.randomBytes(8).toString('hex')}`;
	} while (used.has(id));
	used.add(id);
	return id;
}

function answerAttributes() {
	return isEnabled('autocomplete') ?
		' autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"' :
		'';
}

function buildInput(question, tokenEnabled, usedIds) {
	const inputId = tokenEnabled ? randomInputId(usedIds) : `${INPUT_PREFIX}${question.index}`;
	return {
		index: question.index,
		inputId,
		html: `
			<div class="mb-2">${helpers.escape(question.question)}</div>
			<input class="form-control" name="${inputId}" id="${inputId}" aria-required="true" aria-describedby="registration-question-answer-help"${answerAttributes()} />
		`,
	};
}

function honeypotField() {
	return `<input type="text" name="${HONEYPOT_FIELD}" value="" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;height:0;width:0;overflow:hidden;" />`;
}

function buildQuestionsToken(inputs) {
	const now = Date.now();
	return sign({
		v: 1,
		iat: now,
		exp: now + TOKEN_TTL_MS,
		ids: inputs.map(input => ({ id: input.inputId, i: input.index })),
	});
}

function buildStartedToken() {
	return sign({ iat: Date.now() });
}

function rateHash(ip) {
	return crypto.createHmac('sha256', getSecret()).update(String(ip || 'unknown')).digest('hex');
}

function failKey(hash) {
	return `${SECURITY_PREFIX}fail:${hash}`;
}

function lockKey(hash) {
	return `${SECURITY_PREFIX}lock:${hash}`;
}

async function isLocked(hash) {
	try {
		return await db.exists(lockKey(hash));
	} catch (err) {
		// Fail open: a database error must not block registrations.
		return false;
	}
}

async function recordFailure(hash) {
	try {
		const windowMinutes = getInt('rate-limit:window', 15, 1, 1440);
		const attempts = getInt('rate-limit:attempts', 5, 1, 100);
		const lockoutMinutes = getInt('rate-limit:lockout', 15, 1, 1440);
		const key = failKey(hash);
		const count = Number(await db.incrObjectField(key, 'count'));

		if (count === 1) {
			await db.expire(key, windowMinutes * 60);
		}

		if (count >= attempts) {
			await db.setObject(lockKey(hash), { locked: 1 });
			await db.expire(lockKey(hash), lockoutMinutes * 60);
			await db.delete(key);
		}
	} catch (err) {
		// Fail open: a database error must not block registrations.
	}
}

async function clearFailures(hash) {
	try {
		await db.delete(failKey(hash));
		await db.delete(lockKey(hash));
	} catch (err) {
		// Fail open.
	}
}

plugin.init = async function(params) {
	const { router } = params;
	const routeHelpers = nodebb.require('./src/routes/helpers');
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/registration-question', function (req, res) {
		res.render('admin/plugins/registration-question', {
			title: 'Registration Question & Answer Extended',
		});
	});
};

plugin.addAdminNavigation = async function(header) {
	header.plugins.push({
		route: '/plugins/registration-question',
		icon: 'fa-tint',
		name: 'Registration Question Extended'
	});
	return header;
};

plugin.addCaptcha = async function (params) {
	const questions = getQuestions();
	if (!questions.length) {
		return params;
	}

	const tokenEnabled = isEnabled('token');
	const count = questionCount(questions.length);
	const requiresToken = tokenEnabled || count < questions.length;
	const usedIds = new Set();
	const ordered = rotationEnabled() ? shuffle(questions) : questions;
	const inputs = ordered.slice(0, count).map(question => buildInput(question, tokenEnabled, usedIds));
	const hiddenFields = [];

	// Bind a subset to its form even when field-name randomization is disabled.
	if (requiresToken) {
		hiddenFields.push(`<input type="hidden" name="${TOKEN_FIELD}" value="${buildQuestionsToken(inputs)}" />`);
	} else if (isEnabled('timing')) {
		hiddenFields.push(`<input type="hidden" name="${STARTED_FIELD}" value="${buildStartedToken()}" />`);
	}

	if (isEnabled('honeypot')) {
		hiddenFields.push(honeypotField());
	}

	const formHelp = `<div class="form-text" id="registration-question-answer-help">[[registration-question:answer-help]]</div>`;
	const formExtras = `${formHelp}${hiddenFields.join('')}`;

	if (params.templateData.regFormEntry && Array.isArray(params.templateData.regFormEntry)) {
		inputs.forEach((input, index) => {
			params.templateData.regFormEntry.push({
				label: '[[registration-question:input-label]]',
				inputId: input.inputId,
				html: index === 0 ? `${input.html}${formExtras}` : input.html,
			});
		});
	} else {
		// Older NodeBB versions only render a single captcha block.
		params.templateData.captcha = {
			label: '[[registration-question:input-label]]',
			inputId: 'registration-question',
			html: `${inputs.map(input => input.html).join('')}${formExtras}`,
		};
	}

	return params;
};

plugin.checkRegister = async function(params) {
	const body = params.req.body || {};
	const { username, email } = params.userData || body;
	const exclusions = getExcludedTerms();
	if (containsExcludedTerm('username', username, exclusions)) {
		throw new Error('[[registration-question:error-excluded-username]]');
	}
	if (containsExcludedTerm('email', email, exclusions)) {
		throw new Error('[[registration-question:error-excluded-email]]');
	}

	const questions = getQuestions();
	if (!questions.length) {
		return params;
	}

	const rateLimitEnabled = isEnabled('rate-limit');
	const hash = rateLimitEnabled ? rateHash(params.req.ip) : '';

	if (rateLimitEnabled && await isLocked(hash)) {
		throw new Error('[[registration-question:error-too-many-attempts]]');
	}

	try {
		const count = questionCount(questions.length);
		const requiresToken = isEnabled('token') || count < questions.length;
		let startedAt = null;
		let fields;

		if (requiresToken) {
			const token = verify(body[TOKEN_FIELD]);
			if (
				!token ||
				token.v !== 1 ||
				!Array.isArray(token.ids) ||
				token.ids.length !== count ||
				typeof token.iat !== 'number' ||
				typeof token.exp !== 'number' ||
				token.exp < Date.now() ||
				token.iat > Date.now() + 60 * 1000
			) {
				throw new Error('[[registration-question:error-blocked]]');
			}

			startedAt = token.iat;

			const byIndex = new Map(questions.map(question => [question.index, question]));
			const seenIds = new Set();
			fields = [];

			for (const item of token.ids) {
				if (!item || typeof item.id !== 'string' || !byIndex.has(item.i) || seenIds.has(item.id)) {
					throw new Error('[[registration-question:error-blocked]]');
				}

				seenIds.add(item.id);
				fields.push({
					answers: byIndex.get(item.i).answers,
					given: body[item.id],
				});
				byIndex.delete(item.i);
			}
		} else if (isEnabled('timing')) {
			const started = verify(body[STARTED_FIELD]);
			if (!started || typeof started.iat !== 'number') {
				throw new Error('[[registration-question:error-blocked]]');
			}
			startedAt = started.iat;
		}

		if (isEnabled('honeypot') && String(body[HONEYPOT_FIELD] || '').trim() !== '') {
			throw new Error('[[registration-question:error-blocked]]');
		}

		if (isEnabled('timing') && startedAt !== null) {
			const minSeconds = getInt('min-seconds', 3, 0, 60);
			if (minSeconds > 0 && Date.now() - startedAt < minSeconds * 1000) {
				throw new Error('[[registration-question:error-blocked]]');
			}
		}

		fields ??= questions.map(question => ({
			answers: question.answers,
			given: body[`${INPUT_PREFIX}${question.index}`],
		}));

		for (const { answers, given } of fields) {
			if (typeof given !== 'string' || !answers.includes(normalizeAnswer(given))) {
				throw new Error('[[registration-question:error-wrong-answer]]');
			}
		}

		if (rateLimitEnabled) {
			await clearFailures(hash);
		}

		return params;
	} catch (err) {
		if (rateLimitEnabled) {
			await recordFailure(hash);
		}
		throw err;
	}
};

plugin.checkRegistrationEmail = async function (params) {
	if (params.registration && params.allowed && containsExcludedTerm('email', params.email, getExcludedTerms())) {
		params.allowed = false;
		params.error = '[[registration-question:error-excluded-email]]';
	}
	return params;
};
