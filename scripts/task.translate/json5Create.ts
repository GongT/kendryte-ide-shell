import { assert } from '../library/misc/errorUtil';

const objectKey = /^[a-z][a-z0-9_]*$/i;

export class JsonBuilder {
	private _tab = '';
	private _content = '';
	
	private allowValue: boolean = true;
	private allowKey: boolean = false;
	
	startObject() {
		assert(this.allowValue || this._tab.length === 0, 'not allow startObject here');
		
		this._content += '{\n';
		this._tab += '\t';
		
		this.allowKey = true;
		this.allowValue = false;
	}
	
	endObject() {
		assert(this.allowKey, 'not allow endObject here');
		
		this._tab = this._tab.slice(1);
		this.tab('}');
		if (this._tab.length === 0) { // root object
			this._content += '\n';
			this.allowKey = false;
		} else {
			this._content += ',\n';
			this.allowKey = true;
		}
		
		this.allowValue = false;
	}
	
	public writeKeyValue(key: string, value: string) {
		this.writeKey(key);
		this.writeValue(value);
	}
	
	writeKey(key: string) {
		assert(this.allowKey, 'not allow key here');
		
		this.tab(`${this.key(key)}: `);
		
		this.allowKey = false;
		this.allowValue = true;
	}
	
	writeValue(key: string) {
		assert(this.allowValue, 'not allow value here');
		
		this._content += JSON.stringify('' + key) + ',\n';
		
		this.allowKey = true;
		this.allowValue = false;
	}
	
	writeComment(note: string, message: string) {
		assert(this.allowKey || this._tab.length === 0, 'not allow comment here');
		
		const lines = message.split(/\n/g);
		if (note) {
			this.tab(`// ${note.toUpperCase()}: ${lines.shift()}\n`);
		}
		lines.forEach((line) => {
			this.tab(`// ${line}\n`);
		});
	}
	
	private key(k: string) {
		if (objectKey.test(k)) {
			return k;
		} else {
			return JSON.stringify(k);
		}
	}
	
	private tab(l: string) {
		this._content += `${this._tab}${l}`;
	}
	
	toString() {
		assert(this._tab === '', 'object must end.');
		return this._content;
	}
}
