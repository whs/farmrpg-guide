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
	readonly waitedForReset?: true,
}

export interface PlayerInfo {
	maxInventory: number,
	farmSize: number,
	maxStamina: number,
	skills: Skills,
	perks: string[],
	goldPerks: string[],

	// Daily
	coopEggs: number,
	coopFeathers: number,
	pastureMilk: number,
	orchardApple: number,
	orchardOrange: number,
	orchardLemon: number,

	// Hourly
	sawmillBoard: number,
	sawmillWood: number,

	// 10 min-ly
	hayfieldStraw: number,
	quarryStone: number,
	quarryCoal: number,
}

export interface Skills {
	farming: number,
	fishing: number,
	crafting: number,
	exploring: number,
	cooking?: number,
	mining?: number,
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
export const INFERNO_SPHERE_ID = 169;
export const COMPASS_ID = 315;
export const DETECTOR_ID = 613;
export const GARY_CRUSHROOM_KEY_ID = 1179;
export const LAVA_SPHERE_ID = 220;
export const TRIBAL_MASK_ID = 313;
export const MAPPING_COMPASS_ID = 476;
export const WATER_ORB_ID = 701;
export const APPLE_ID = 44;
export const ORANGE_ID = 61;
export const LEMON_ID = 62;
export const EGGS_ID = 26;
export const FEATHERS_ID = 42;
export const MILK_ID = 85;
export const BOARD_ID = 21;
export const WOOD_ID = 35;
export const STRAW_ID = 128;
export const STONE_ID = 40;
export const COAL_ID = 103;

export class GameplayError extends Error {
}
