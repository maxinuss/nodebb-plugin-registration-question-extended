"use strict";

const plugin = module.exports;
const meta = nodebb.require('./src/meta');
const helpers = nodebb.require('./src/helpers');

const CONFIG_KEY = 'registration-question:questions';
const INPUT_PREFIX = 'registration-question-';

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
		const answer = item && typeof item.answer === 'string' ? item.answer.trim() : '';

		if (question && answer) {
			questions.push({ index, question, answer });
		}

		return questions;
	}, []);
}

function shuffle(array) {
	for (let i = array.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function buildInput(question) {
	const inputId = `${INPUT_PREFIX}${question.index}`;
	return {
		inputId,
		html: `
			<div class="mb-2">${helpers.escape(question.question)}</div>
			<input class="form-control" name="${inputId}" id="${inputId}" aria-required="true" />
		`,
	};
}

plugin.init = async function(params) {
	const { router } = params;
	const routeHelpers = nodebb.require('./src/routes/helpers');
	routeHelpers.setupAdminPageRoute(router, '/admin/plugins/registration-question', function (req, res) {
		res.render('admin/plugins/registration-question', {
			title: 'Registration Question & Answer',
		});
	});
};

plugin.addAdminNavigation = async function(header) {
	header.plugins.push({
		route: '/plugins/registration-question',
		icon: 'fa-tint',
		name: 'Registration Question'
	});
	return header;
};

plugin.addCaptcha = async function (params) {
	const questions = getQuestions();
	if (!questions.length) {
		return params;
	}

	// Shuffle a copy so the stored indexes (and therefore the input names) stay stable.
	const shuffled = shuffle(questions.slice());

	if (params.templateData.regFormEntry && Array.isArray(params.templateData.regFormEntry)) {
		shuffled.forEach((question) => {
			const input = buildInput(question);
			params.templateData.regFormEntry.push({
				label: '[[registration-question:input-label]]',
				inputId: input.inputId,
				html: input.html,
			});
		});
	} else {
		// Older NodeBB versions only render a single captcha block.
		params.templateData.captcha = {
			label: '[[registration-question:input-label]]',
			inputId: 'registration-question',
			html: shuffled.map(question => buildInput(question).html).join(''),
		};
	}

	return params;
};

plugin.checkRegister = async function(params) {
	const questions = getQuestions();
	if (!questions.length) {
		return params;
	}

	const body = params.req.body || {};

	for (const question of questions) {
		const inputId = `${INPUT_PREFIX}${question.index}`;
		const answer = String(body[inputId] || '').trim();

		if (answer.toLowerCase() !== question.answer.toLowerCase()) {
			throw new Error('[[registration-question:error-wrong-answer]]');
		}
	}

	return params;
};
