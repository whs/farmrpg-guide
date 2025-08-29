import {Action, IRON_ID, NAILS_ID, SearchState} from "../types.ts";
import {getItemInfo, ItemInfo, QuestInfo} from "../../data/buddyfarm.ts";
import {produce} from "immer";
import {increaseInventoryItem, increaseSilver, MENUING_TIME} from "../utils.ts";

export class SubmitQuest implements Action {
	#lastState: SearchState;
	quest: QuestInfo;

	constructor(quest: QuestInfo, state: SearchState) {
		this.#lastState = state;
		this.quest = quest;
	}

	getTimeRequired(): number {
		return MENUING_TIME;
	}

	async nextState(): Promise<SearchState> {
		let requiredItems = await Promise.all(this.quest.requiredItems.map(async (item) => ({
			info: await getItemInfo(item.item.name),
			item
		})));
		let rewardItems = await Promise.all(this.quest.rewardItems.map(async (item) => ({
			info: await getItemInfo(item.item.name),
			item
		})));

		return produce(this.#lastState, (draft) => {
			draft.inventory = this.#lastState.inventory.slice();

			increaseSilver(draft, -(this.quest.requiredSilver || 0));
			increaseSilver(draft, this.quest.rewardSilver);

			for (let item of requiredItems) {
				increaseInventoryItem(
					draft.inventory,
					item.info.id,
					-item.item.quantity,
					this.#lastState.playerInfo.maxInventory
				);
			}

			for (let item of rewardItems) {
				increaseInventoryItem(
					draft.inventory,
					item.info.id,
					item.item.quantity,
					this.#lastState.playerInfo.maxInventory
				);
			}

			let index = this.#lastState.objectives.findIndex((q) => q.quest?.name === this.quest.name);
			if (index === -1) {
				throw new Error("quest not found");
			}
			let quest = this.#lastState.objectives[index];
			draft.objectives.splice(index, 1);
			draft.completedObjectives.push(quest);
		});
	}

	toString(): string {
		return `Submit Quest ${this.quest.name}`;
	}
}

export class BuyItemStore implements Action {
	item: ItemInfo;
	amount: number;
	#lastState: SearchState;

	constructor(item: ItemInfo, amount: number, state: SearchState) {
		if (!item.canBuy) {
			throw new Error(`Cannot buy item ${item.name}`);
		}
		this.item = item;
		this.amount = Math.min(state.playerInfo.maxInventory, amount);
		this.#lastState = state;
	}

	getTimeRequired(): number {
		if (this.#lastState.playerInfo.goldPerks.includes("Iron Depot") && [IRON_ID, NAILS_ID].includes(this.item.id)) {
			return 0;
		}
		return MENUING_TIME;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#lastState, (draft) => {
			draft.inventory = this.#lastState.inventory.slice();

			increaseSilver(draft, -(this.item.buyPrice * this.amount));

			increaseInventoryItem(draft.inventory, this.item.id, this.amount, this.#lastState.playerInfo.maxInventory);
		})
	}

	toString(): string {
		return `Buy ${this.item.name} ×${this.amount}`;
	}

	collapseWith(action: Action): Action | null {
		// Skip buying nails/iron if the perks are purchased
		if (this.#lastState.playerInfo.goldPerks.includes("Iron Depot") && [IRON_ID, NAILS_ID].includes(this.item.id)) {
			return action;
		}
		if(action instanceof BuyItemStore && action.item.id === this.item.id) {
			this.amount += action.amount;
			return this;
		}
		return null;
	}
}

export class OpenChest implements Action {
	chest: ItemInfo;
	amount: number;
	#lastState: SearchState;

	constructor(chest: ItemInfo, amount: number, state: SearchState) {
		this.chest = chest;
		this.amount = Math.min(state.playerInfo.maxInventory, amount);
		this.#lastState = state;
	}

	getTimeRequired(): number {
		return MENUING_TIME;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#lastState, (draft) => {
			draft.inventory = this.#lastState.inventory.slice();

			increaseInventoryItem(draft.inventory, this.chest.id, -this.amount, this.#lastState.playerInfo.maxInventory);
			if(this.chest.locksmithKey){
				increaseInventoryItem(draft.inventory, this.chest.locksmithKey.id, -this.amount, this.#lastState.playerInfo.maxInventory);
			}

			for(let item of this.chest.locksmithItems) {
				let averageRoll = (item.quantityMax!! + item.quantityMin!!) / 2;
				increaseInventoryItem(draft.inventory, item.outputItem.id, Math.floor(this.amount * averageRoll), this.#lastState.playerInfo.maxInventory);
			}
		})
	}

	toString(): string {
		return `Open ${this.chest.name} ×${this.amount}`;
	}

	collapseWith(action: Action): Action | null {
		if(action instanceof OpenChest && action.chest.id === this.chest.id) {
			this.amount += action.amount;
			return this;
		}
		return null;
	}
}
