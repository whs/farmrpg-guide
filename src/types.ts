export enum QuestType {
	Normal = 0,
	Special = 1,
	Personal = 2,
}

export interface Quest {
	name: string;
	type: QuestType;
}
