import { IOutOfBandRecord, MINode } from './mi2Parser';

export function outOfBandRecords(parsed: MINode, filter: { inStream?: boolean; type?: string } = {}) {
	if (!parsed.outOfBandRecord || !parsed.outOfBandRecord.length) {
		return [];
	}

	let objs = parsed.outOfBandRecord;
	if (filter.inStream) {
		objs = objs.filter(item => item.isStream === filter.inStream);
	}
	if (filter.type) {
		objs = objs.filter(item => item.type === filter.type);
	}

	return objs;
}

export interface IRecordWorker {
	(record: IOutOfBandRecord): boolean;
}

export function outOfBandRecordMap<SELF>(parsed: MINode, inStream: boolean, callbackMapper: { [id: string]: IRecordWorker }) {
	for (const record of outOfBandRecords(parsed, { inStream })) {
		if (callbackMapper.hasOwnProperty(record.type)) {
			parsed.handled = callbackMapper[record.type](record);
		}
	}
}
