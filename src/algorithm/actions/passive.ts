import {
	Action,
	APPLE_ID,
	BOARD_ID,
	COAL_ID,
	EGGS_ID,
	FEATHERS_ID,
	FEED_ID,
	FLOUR_ID,
	GRAPES_ID,
	LEMON_ID,
	MILK_ID,
	ORANGE_ID,
	SearchState,
	STEEL_ID,
	STEEL_WIRE_ID,
	STONE_ID,
	STRAW_ID,
	WHEAT_ID,
	WOOD_ID
} from "../types.ts";
import {ItemInfo} from "../../data/buddyfarm.ts";
import {produce} from "immer";
import {getTimeUntilNextReset, increaseInventoryItem} from "../utils.ts";

export class FlourMill implements Action {
	#amount: number;
	#state: SearchState;

	constructor(desiredAmount: number, state: SearchState) {
		this.#amount = Math.min(state.playerInfo.maxInventory, desiredAmount);
		this.#state = state;
	}

	#getFlourPerMinute(): number {
		if (this.#state.playerInfo.goldPerks.includes("Flour Power")) {
			return 2;
		}

		return 1;
	}

	toString(): string {
		return `Produce Flour ×${this.#amount}`;
	}

	getTimeRequired(): number {
		return (this.#amount / this.#getFlourPerMinute()) * 60000;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			draft.inventory = this.#state.inventory.slice();
			increaseInventoryItem(draft.inventory, WHEAT_ID, -Math.ceil(this.#amount / 14.4), this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, FLOUR_ID, this.#amount, this.#state.playerInfo.maxInventory);
		});
	}
}

export class FeedMill implements Action {
	#input: ItemInfo;
	#amount: number;
	#state: SearchState;

	static feedTable: Record<string, number> = {
		"Watermelon": 1,
		"Corn": 2,
		"Cabbage": 3,
		"Pine Tree": 4,
		"Pumpkin": 5,
		"Wheat": 12,
		"Broccoli": 24,
	};

	constructor(inputCrop: ItemInfo, desiredAmount: number, state: SearchState) {
		this.#input = inputCrop;
		this.#amount = Math.min(state.playerInfo.maxInventory, desiredAmount);
		this.#state = state;
	}

	#getFeedPerMinute(): number {
		if (this.#state.playerInfo.goldPerks.includes("Feed Boost")) {
			return 2;
		}

		return 1;
	}

	toString(): string {
		return `Produce Feed ×${this.#amount} from ${this.#input.name}`;
	}

	getTimeRequired(): number {
		return (this.#amount / this.#getFeedPerMinute()) * 60000;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			draft.inventory = this.#state.inventory.slice();
			let producePerInput = FeedMill.feedTable[this.#input.name];
			let inputRequired = Math.ceil(this.#amount / producePerInput);
			increaseInventoryItem(draft.inventory, this.#input.id, -inputRequired, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, FEED_ID, this.#amount, this.#state.playerInfo.maxInventory);
		});
	}
}

export class WaitForReset implements Action {
	#state: SearchState

	constructor(state: SearchState) {
		this.#state = state;
	}

	getTimeRequired(): number {
		if (this.#state.waitedForReset) {
			return 24 * 60 * 60000;
		}

		return getTimeUntilNextReset();
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			draft.inventory = this.#state.inventory.slice();
			// Trees already include the perk bonuses
			increaseInventoryItem(draft.inventory, APPLE_ID, this.#state.playerInfo.orchardApple, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, ORANGE_ID, this.#state.playerInfo.orchardOrange, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, LEMON_ID, this.#state.playerInfo.orchardLemon, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, EGGS_ID, this.#state.playerInfo.coopEggs, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, FEATHERS_ID, this.#state.playerInfo.coopFeathers, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, MILK_ID, this.#state.playerInfo.pastureMilk, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, GRAPES_ID, this.#state.playerInfo.vineyardGrapes, this.#state.playerInfo.maxInventory);
			draft.waitedForReset = true;
		})
	}

	toString(): string {
		return "Wait for next reset"
	}
}

export class WaitForHourly implements Action {
	#state: SearchState

	constructor(state: SearchState) {
		this.#state = state;
	}

	getTimeRequired(): number {
		return 60 * 60000;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			draft.inventory = this.#state.inventory.slice();
			increaseInventoryItem(draft.inventory, BOARD_ID, this.#state.playerInfo.sawmillBoard, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, WOOD_ID, this.#state.playerInfo.sawmillWood, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, STEEL_ID, this.#state.playerInfo.steelworksSteel, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, STEEL_WIRE_ID, this.#state.playerInfo.steelworksSteelWire, this.#state.playerInfo.maxInventory);
		})
	}

	toString(): string {
		return "Wait for next hour"
	}
}

export class WaitFor10Min implements Action {
	#state: SearchState

	constructor(state: SearchState) {
		this.#state = state;
	}

	getTimeRequired(): number {
		return 10 * 60000;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			draft.inventory = this.#state.inventory.slice();
			increaseInventoryItem(draft.inventory, STRAW_ID, this.#state.playerInfo.hayfieldStraw, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, STONE_ID, this.#state.playerInfo.quarryStone, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, COAL_ID, this.#state.playerInfo.quarryCoal, this.#state.playerInfo.maxInventory);
		})
	}

	toString(): string {
		return "Wait for 10 minutes"
	}
}