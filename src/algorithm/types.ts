import {QuestInfo} from "../data/buddyfarm.ts";

export const MAX_ITEMS = 2000;

export interface Objective {
	readonly quest?: QuestInfo
}

export interface SearchState {
	readonly inventory: Uint16Array,
	readonly silver: number,
	readonly objectives: readonly Objective[],
	readonly completedObjectives: readonly Objective[],

	readonly playerInfo: PlayerInfo,
}

export interface PlayerInfo {
	maxInventory: number,
	farmSize: number,
	maxStamina: number,
}

export interface Provider {
	getTimeRequired(): number,
	nextState(): Promise<SearchState>,
	toString(): string,
}

export const LEMONADE_ID = 86;
export const ARNOLD_PALMER_ID = 508;
export const APPLE_CIDER_ID = 379;
export const ORANGE_JUICE_ID = 84;
export const FISHING_NET_ID = 194;
export const LARGE_FISHING_NET_ID = 500;
export const WORM_ID = 18;
export const GRUB_ID = 191;
export const MINNOW_ID = 192;
export const GUMMY_WORM_ID = 277;
export const MEALWORM_ID = 498;
export const IRON_ID = 22;
export const NAILS_ID = 38;

export class GameplayError extends Error {
}