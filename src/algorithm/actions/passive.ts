import {
	Action,
	APPLE_ID,
	BOARD_ID,
	COAL_ID,
	EGGS_ID,
	FEATHERS_ID,
	FEED_ID,
	FLOUR_ID,
	GameplayError,
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
import {original, produce, WritableDraft} from "immer";
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

	collapseWith(action: Action): Action | null {
		if(action instanceof FlourMill) {
			this.#amount += action.#amount;
			return this;
		}
		return null;
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

	collapseWith(action: Action): Action | null {
		if(action instanceof FeedMill && action.#input.id === this.#input.id) {
			this.#amount += action.#amount;
			return this;
		}
		return null;
	}
}

export class WaitForReset implements Action {
	#state: SearchState

	constructor(state: SearchState) {
		this.#state = state;
	}

	getTimeRequired(): number {
		return getTimeUntilNextReset();
	}

	async nextState(): Promise<SearchState> {
		if(this.#state.waitedForReset) {
			throw new GameplayError("Cannot use WaitForReset - use WaitFor")
		}
		return produce(this.#state, (draft) => {
			draft.inventory = this.#state.inventory.slice();
			WaitForReset._updateDaily(draft, 1);
		})
	}

	static _updateDaily(draft: WritableDraft<SearchState>, count: number) {
		let state = original(draft)!!;
		// Trees already include the perk bonuses
		increaseInventoryItem(draft.inventory, APPLE_ID, state.playerInfo.orchardApple * count, state.playerInfo.maxInventory);
		increaseInventoryItem(draft.inventory, ORANGE_ID, state.playerInfo.orchardOrange * count, state.playerInfo.maxInventory);
		increaseInventoryItem(draft.inventory, LEMON_ID, state.playerInfo.orchardLemon * count, state.playerInfo.maxInventory);
		increaseInventoryItem(draft.inventory, EGGS_ID, state.playerInfo.coopEggs * count, state.playerInfo.maxInventory);
		increaseInventoryItem(draft.inventory, FEATHERS_ID, state.playerInfo.coopFeathers * count, state.playerInfo.maxInventory);
		increaseInventoryItem(draft.inventory, MILK_ID, state.playerInfo.pastureMilk * count, state.playerInfo.maxInventory);
		increaseInventoryItem(draft.inventory, GRAPES_ID, state.playerInfo.vineyardGrapes * count, state.playerInfo.maxInventory);
		draft.waitedForReset = true;
	}

	toString(): string {
		return "Wait for next reset"
	}
}

export class WaitFor implements Action {
	#state: SearchState;
	mins: number;
	#tenMinCount: number;
	#hourlyCount: number;
	#dailyCount: number;

	constructor(state: SearchState, mins: number) {
		this.#state = state;
		this.mins = mins;
		this.#tenMinCount = Math.floor(mins / 10);
		this.#hourlyCount = Math.floor(mins / 60);
		this.#dailyCount = Math.floor(mins / (24*60));
	}

	getTimeRequired(): number {
		return this.mins * 60000;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			draft.inventory = this.#state.inventory.slice();
			increaseInventoryItem(draft.inventory, BOARD_ID, this.#state.playerInfo.sawmillBoard * this.#hourlyCount, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, WOOD_ID, this.#state.playerInfo.sawmillWood * this.#hourlyCount, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, STEEL_ID, this.#state.playerInfo.steelworksSteel * this.#hourlyCount, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, STEEL_WIRE_ID, this.#state.playerInfo.steelworksSteelWire * this.#hourlyCount, this.#state.playerInfo.maxInventory);

			increaseInventoryItem(draft.inventory, STRAW_ID, this.#state.playerInfo.hayfieldStraw * this.#tenMinCount, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, STONE_ID, this.#state.playerInfo.quarryStone * this.#tenMinCount, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, COAL_ID, this.#state.playerInfo.quarryCoal * this.#tenMinCount, this.#state.playerInfo.maxInventory);

			WaitForReset._updateDaily(draft, this.#dailyCount);
		});
	}

	toString(): string {
		if(this.#dailyCount > 0){
			return `Wait for ${this.#dailyCount} days`;
		}
		if(this.#hourlyCount > 0){
			return `Wait for ${this.#hourlyCount} hours`;
		}
		return `Wait for ${this.#tenMinCount * 10} minutes`;
	}

	collapseWith(action: Action): Action | null {
		if (action instanceof WaitFor) {
			return new WaitFor(this.#state, this.mins + action.mins);
		}
		return null;
	}
}
