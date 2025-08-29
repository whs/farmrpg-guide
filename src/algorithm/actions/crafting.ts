import {Action, GameplayError, SearchState} from "../types.ts";
import {ItemInfo} from "../../data/buddyfarm.ts";
import {increaseInventoryItem, MENUING_TIME} from "../utils.ts";
import {produce} from "immer";

export class CraftItem implements Action {
	item: ItemInfo;
	amount: number;
	craftTimes: number;
	#lastState: SearchState;

	constructor(item: ItemInfo, desiredAmount: number, state: SearchState) {
		this.item = item;
		if (!this.item.canCraft) {
			throw new Error(`Item ${item.name} is not craftable`);
		}
		this.#lastState = state;
		const maxCraftable = this.getCraftableAmount(desiredAmount);
		this.amount = Math.min(state.playerInfo.maxInventory, maxCraftable);

		let resourceSaverBonus = 0;
		if (state.playerInfo.perks.includes("Resource Saver I")) {
			resourceSaverBonus += 0.1;
		}
		if (state.playerInfo.goldPerks.includes("Resource Saver II")) {
			resourceSaverBonus += 0.15;
		}

		this.craftTimes = Math.ceil(this.amount / (1 + resourceSaverBonus));
	}

	getCraftableAmount(desiredAmount: number): number {
		if (this.item.recipeItems.length === 0) {
			return 0;
		}

		const craftableAmounts = this.item.recipeItems.map((recipeItem) => {
			return Math.floor(this.#lastState.inventory[recipeItem.item.id] / recipeItem.quantity);
		});

		return Math.min(desiredAmount, ...craftableAmounts);
	}

	toString(): string {
		return `Craft ${this.item.name} ×${this.craftTimes}`;
	}

	getTimeRequired(): number {
		return MENUING_TIME;
	}

	async nextState(): Promise<SearchState> {
		if (this.item.craftingLevel > this.#lastState.playerInfo.skills.crafting) {
			throw new GameplayError(`Item needs ${this.item.craftingLevel} crafting`);
		}

		return produce(this.#lastState, (draft) => {
			draft.inventory = this.#lastState.inventory.slice();

			for (let item of this.item.recipeItems) {
				increaseInventoryItem(draft.inventory, item.item.id, -(this.craftTimes * item.quantity), this.#lastState.playerInfo.maxInventory);
			}

			increaseInventoryItem(draft.inventory, this.item.id, this.amount, this.#lastState.playerInfo.maxInventory);
		});
	}
}