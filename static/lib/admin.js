'use strict';

define('admin/plugins/registration-question', ['admin/settings'], function (Settings) {
	const ACP = {};

	function parseQuestions(value) {
		try {
			const parsed = JSON.parse(value || '[]');
			return Array.isArray(parsed) ? parsed : [];
		} catch (err) {
			return [];
		}
	}

	ACP.init = function () {
		const $container = $('#registration-questions');
		const $hidden = $('#registration-question-questions');
		const $add = $('#registration-question-add');
		const questionPlaceholder = $container.attr('data-question-placeholder') || 'Question';
		const answerPlaceholder = $container.attr('data-answer-placeholder') || 'Answer';
		const addAnswerLabel = $container.attr('data-add-answer') || 'Add valid answer';
		const removeAnswerLabel = $container.attr('data-remove-answer') || 'Remove answer';
		const removeQuestionLabel = $container.attr('data-remove-question') || 'Remove question';

		// Populate the hidden field from app.config before reading it.
		Settings.prepare();

		const questions = parseQuestions($hidden.val());

		function sync(markDirty) {
			const rows = [];

			$container.find('.registration-question-row').each(function () {
				const $row = $(this);
				const question = String($row.find('[data-role="question"]').val() || '').trim();
				const answers = $row.find('[data-role="answer"]').get()
					.map(input => input.value.trim()).filter(Boolean);

				if (question && answers.length) {
					rows.push({ question, answers });
				}
			});

			$hidden.val(JSON.stringify(rows));
			if (markDirty) {
				$hidden.trigger('change');
			}
		}

		function addAnswer($list, answer) {
			const $entry = $('<div class="d-flex gap-2"></div>');
			const $input = $('<input type="text" class="form-control" data-role="answer">')
				.attr({ placeholder: answerPlaceholder, 'aria-label': answerPlaceholder })
				.val(answer);
			const $remove = $('<button type="button" class="btn btn-outline-danger"></button>')
				.attr({ title: removeAnswerLabel, 'aria-label': removeAnswerLabel })
				.append($('<i class="fa fa-times" aria-hidden="true"></i>'));

			$remove.on('click', function () {
				if ($list.children().length === 1) {
					$input.val('').trigger('focus');
				} else {
					$entry.remove();
				}
				sync(true);
			});

			$list.append($entry.append($input, $remove));
			return $input;
		}

		function addRow(question, answers) {
			const $row = $('<div class="registration-question-row d-flex flex-column flex-md-row align-items-md-start gap-2 mb-3"></div>');
			const $question = $('<input type="text" class="form-control" data-role="question">')
				.attr({ placeholder: questionPlaceholder, 'aria-label': questionPlaceholder })
				.val(question || '');
			const $answers = $('<div class="d-flex flex-column flex-fill gap-2 w-100"></div>');
			const $list = $('<div class="d-flex flex-column gap-2"></div>');
			const $addAnswer = $('<button type="button" class="btn btn-outline-secondary btn-sm align-self-start"></button>')
				.text(addAnswerLabel);
			const $remove = $('<button type="button" class="btn btn-outline-danger align-self-start"></button>')
				.attr({ title: removeQuestionLabel, 'aria-label': removeQuestionLabel })
				.append($('<i class="fa fa-trash" aria-hidden="true"></i>'));

			$addAnswer.on('click', function () {
				addAnswer($list, '').trigger('focus');
			});

			$remove.on('click', function () {
				$row.remove();
				sync(true);
			});

			const values = answers.filter(answer => typeof answer === 'string');
			(values.length ? values : ['']).forEach(answer => addAnswer($list, answer));

			$row.append($question, $answers.append($list, $addAnswer), $remove);
			$container.append($row);
			return $question;
		}

		$container.empty();
		questions.filter(item => item && typeof item.question === 'string').forEach((item) => {
			addRow(item.question, Array.isArray(item.answers) ? item.answers : [item.answer]);
		});
		if (!$container.children().length) {
			addRow('', []);
		}
		sync(false);

		$container.on('input change', 'input', function () {
			sync(true);
		});

		$add.on('click', function () {
			addRow('', []).trigger('focus');
		});

		function bindToggle($checkbox, selector) {
			const $targets = $(selector);
			const update = function () {
				$targets.prop('disabled', !$checkbox.prop('checked'));
			};
			$checkbox.on('change', update);
			update();
		}

		bindToggle($('#rq-timing'), '#rq-min-seconds');
		bindToggle($('#rq-rate-limit'), '#rq-rate-attempts, #rq-rate-window, #rq-rate-lockout');
	};

	return ACP;
});
