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

				<hr>

				<h4>{{tx("registration-question:admin.security")}}</h4>

				<div class="form-check mb-2">
					<input class="form-check-input" type="checkbox" id="rq-honeypot" data-field="registration-question:security:honeypot">
					<label class="form-check-label" for="rq-honeypot">{{tx("registration-question:admin.honeypot")}}</label>
					<div class="form-text">{{tx("registration-question:admin.honeypot-help")}}</div>
				</div>

				<div class="form-check mb-2">
					<input class="form-check-input" type="checkbox" id="rq-timing" data-field="registration-question:security:timing">
					<label class="form-check-label" for="rq-timing">{{tx("registration-question:admin.timing")}}</label>
				</div>
				<div class="mb-3">
					<label class="form-label" for="rq-min-seconds">{{tx("registration-question:admin.min-seconds")}}</label>
					<input type="number" min="0" max="60" class="form-control" id="rq-min-seconds" data-field="registration-question:security:min-seconds" placeholder="3">
				</div>

				<div class="form-check mb-2">
					<input class="form-check-input" type="checkbox" id="rq-token" data-field="registration-question:security:token">
					<label class="form-check-label" for="rq-token">{{tx("registration-question:admin.token")}}</label>
					<div class="form-text">{{tx("registration-question:admin.token-help")}}</div>
				</div>

				<div class="form-check mb-2">
					<input class="form-check-input" type="checkbox" id="rq-rate-limit" data-field="registration-question:security:rate-limit">
					<label class="form-check-label" for="rq-rate-limit">{{tx("registration-question:admin.rate-limit")}}</label>
				</div>
				<div class="row mb-3">
					<div class="col-md-4">
						<label class="form-label" for="rq-rate-attempts">{{tx("registration-question:admin.rate-limit-attempts")}}</label>
						<input type="number" min="1" max="100" class="form-control" id="rq-rate-attempts" data-field="registration-question:security:rate-limit:attempts" placeholder="5">
					</div>
					<div class="col-md-4">
						<label class="form-label" for="rq-rate-window">{{tx("registration-question:admin.rate-limit-window")}}</label>
						<input type="number" min="1" max="1440" class="form-control" id="rq-rate-window" data-field="registration-question:security:rate-limit:window" placeholder="15">
					</div>
					<div class="col-md-4">
						<label class="form-label" for="rq-rate-lockout">{{tx("registration-question:admin.rate-limit-lockout")}}</label>
						<input type="number" min="1" max="1440" class="form-control" id="rq-rate-lockout" data-field="registration-question:security:rate-limit:lockout" placeholder="15">
					</div>
				</div>

				<div class="form-check mb-2">
					<input class="form-check-input" type="checkbox" id="rq-autocomplete" data-field="registration-question:security:autocomplete">
					<label class="form-check-label" for="rq-autocomplete">{{tx("registration-question:admin.autocomplete")}}</label>
					<div class="form-text">{{tx("registration-question:admin.autocomplete-help")}}</div>
				</div>
			</form>
		</div>
	</div>
</div>
