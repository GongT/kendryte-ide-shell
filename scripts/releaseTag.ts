let created: string;

export function createReleaseTag() {
	if (!created) {
		created = create();
	}
	return created;
}

function pad(n: number) {
	return n >= 10? n.toFixed(0) : '0' + n.toFixed(0);
}

function create() {
	const d = new Date();
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${pad(d.getHours())}${pad(d.getMinutes())}`;
}
