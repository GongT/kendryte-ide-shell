import { Breakpoint, Stack, Thread, Variable } from '../../common/mi2/types';
import { MINode } from '../../common/mi2/mi2Parser';
import { VariableObject } from '../type';

export interface IBackend {
	readonly connected: Promise<void>;
	readonly disconnected: Promise<this>;

	connect(load: boolean): Promise<void>;
	reload(): Promise<void>;
	detach(): Promise<any>;

	stop(): Promise<void>;
	interrupt(wait?: boolean): Promise<void>;
	continue(): Promise<void>;

	next(): Promise<void>;
	step(): Promise<void>;
	stepOut(): Promise<void>;

	addBreakPoint(breakpoint: Breakpoint): Promise<Breakpoint>;
	removeBreakPoint(breakpoint: Breakpoint): Promise<boolean>;
	clearBreakPoints(): Promise<boolean>;

	getThreads(): Promise<Thread[]>;
	getStack(maxLevels: number, thread: number): Promise<Stack[]>;
	getStackVariables(thread: number, frame: number): Promise<Variable[]>;

	varAssign(name: string, rawValue: string): Promise<string>
	varUpdate(varObjName: string): Promise<MINode>;
	varCreate(expression: string, varObjName: string): Promise<VariableObject>;
	varListChildren(name: string): Promise<VariableObject[]>;
	changeVariable(name: string, rawValue: string): Promise<string>;

	sendUserInput(expression: string, threadId: number, frameLevel: number): Promise<MINode>;
	evalExpression(name: string, thread: number, frame: number): Promise<MINode>;
	// examineMemory(from: number, to: number): Promise<void>;
}
