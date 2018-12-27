export function createCard(platform: string, ...tables: string[]) {
	return `<div id="col${platform}" class="col-md platform">
	<div class="card">
		<div class="card-header">
			<h5 class="card-title">${platform}</h5>
		</div>
		<div class="card-body">
			${tables.join('\n')}
		</div>
	</div>
</div>`;
}
