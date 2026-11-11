<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12  px-0 mb-4" tabindex="0">
			<form>
				<p>
					{{tx("registration-question:admin.help")}}
				</p>
				<div id="registration-questions"
					data-question-placeholder="{{tx("registration-question:admin.question")}}"
					data-answer-placeholder="{{tx("registration-question:admin.answer")}}"
					data-remove-title="{{tx("registration-question:admin.remove")}}"></div>
				<button type="button" id="registration-question-add" class="btn btn-secondary">
					<i class="fa fa-plus"></i> {{tx("registration-question:admin.add-question")}}
				</button>
				<input type="hidden" data-field="registration-question:questions" id="registration-question-questions">
			</form>
		</div>
	</div>
</div>
