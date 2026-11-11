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
		const removeTitle = $container.attr('data-remove-title') || 'Remove';

		// Populate the hidden field from app.config before reading it.
		Settings.prepare();

		let questions = parseQuestions($hidden.val());
		if (!questions.length) {
			questions = [{ question: '', answer: '' }];
		}

		function sync(markDirty) {
			const rows = [];

			$container.find('.registration-question-row').each(function () {
				const $row = $(this);
				const question = String($row.find('[data-role="question"]').val() || '').trim();
				const answer = String($row.find('[data-role="answer"]').val() || '').trim();

				if (question && answer) {
					rows.push({ question, answer });
				}
			});

			$hidden.val(JSON.stringify(rows));
			if (markDirty) {
				$hidden.trigger('change');
			}
		}

		function addRow(question, answer) {
			const $row = $('<div class="registration-question-row d-flex flex-column flex-md-row gap-2 mb-2"></div>');
			const $question = $('<input type="text" class="form-control" data-role="question">')
				.attr('placeholder', questionPlaceholder)
				.val(question || '');
			const $answer = $('<input type="text" class="form-control" data-role="answer">')
				.attr('placeholder', answerPlaceholder)
				.val(answer || '');
			const $remove = $('<button type="button" class="btn btn-outline-danger" title=""></button>')
				.attr('title', removeTitle)
				.append($('<i class="fa fa-trash"></i>'));

			$remove.on('click', function () {
				$row.remove();
				sync(true);
			});

			$row.append($question, $answer, $remove);
			$container.append($row);
		}

		$container.empty();
		questions.forEach(item => addRow(item.question, item.answer));
		sync(false);

		$container.on('input change', 'input', function () {
			sync(true);
		});

		$add.on('click', function () {
			addRow('', '');
			$container.find('.registration-question-row').last().find('[data-role="question"]').trigger('focus');
		});
	};

	return ACP;
});
