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
			increaseSilver(draft, -(this.quest.requiredSilver || 0));
			increaseSilver(draft, this.quest.rewardSilver);

			for (let item of requiredItems) {
				increaseInventoryItem(draft, item.info.id, -item.item.quantity);
			}

			for (let item of rewardItems) {
				increaseInventoryItem(draft, item.info.id, item.item.quantity);
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

	withNewState(state: SearchState): Action {
		return new SubmitQuest(this.quest, state);
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
			increaseSilver(draft, -(this.item.buyPrice * this.amount));

			increaseInventoryItem(draft, this.item.id, this.amount);
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
			this.amount = Math.min(action.#lastState.playerInfo.maxInventory, this.amount + action.amount);
			return this;
		}
		return null;
	}

	withNewState(state: SearchState): Action {
		return new BuyItemStore(this.item, this.amount, state);
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
			increaseInventoryItem(draft, this.chest.id, -this.amount);
			if(this.chest.locksmithKey){
				increaseInventoryItem(draft, this.chest.locksmithKey.id, -this.amount);
			}

			for(let item of this.chest.locksmithItems) {
				let averageRoll = (item.quantityMax!! + item.quantityMin!!) / 2;
				if (this.chest.locksmithGrabBag) {
					// Grab bags only drop 1 of the items
					averageRoll /= this.chest.locksmithItems.length;
				}
				increaseInventoryItem(draft, item.outputItem.id, Math.floor(this.amount * averageRoll));
			}
		})
	}

	toString(): string {
		return `Open ${this.chest.name} ×${this.amount}`;
	}

	collapseWith(action: Action): Action | null {
		if(action instanceof OpenChest && action.chest.id === this.chest.id) {
			this.amount = Math.min(action.#lastState.playerInfo.maxInventory, this.amount + action.amount);
			return this;
		}
		return null;
	}

	withNewState(state: SearchState): Action {
		return new OpenChest(this.chest, this.amount, state);
	}
}

export class SellItem implements Action {
	item: ItemInfo;
	amount: number;
	#lastState: SearchState;

	constructor(item: ItemInfo, amount: number, state: SearchState) {
		this.item = item;
		this.amount = amount;
		this.#lastState = state;
	}

	getTimeRequired(): number {
		return MENUING_TIME;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#lastState, (draft) => {
			increaseInventoryItem(draft, this.item.id, -this.amount);
			// TODO: Buddyfarm doesn't have item price
			let itemPrice = Math.pow(1.27, this.item.craftingLevel || this.item.cookingLevel || 1);
			increaseSilver(draft, Math.round(this.amount * itemPrice));
		})
	}

	toString(): string {
		return `Sell ${this.item.name} ×${this.amount}`;
	}

	collapseWith(action: Action): Action | null {
		if(action instanceof SellItem && action.item.id === this.item.id) {
			this.amount += action.amount;
			return this;
		}
		return null;
	}

	withNewState(state: SearchState): Action {
		return new SellItem(this.item, this.amount, state);
	}
}

type NPCItemLike = "loves" | "likes" | "hates";

const NPC_XP_MAP: {[key in NPCItemLike]: number} = {
	"loves": 150,
	"likes": 25,
	"hates": -50,
};

export class GiveToNPC implements Action {
	item: ItemInfo;
	npc: string;
	amount: number;
	#npcRelationship: NPCItemLike | "";
	#lastState: SearchState;

	constructor(item: ItemInfo, npc: string, amount: number, state: SearchState) {
		this.item = item;
		this.npc = npc;
		this.amount = amount;

		this.#npcRelationship = "";
		for(let npcInfo of item.npcItems){
			if(npcInfo.npc.name === npc) {
				this.#npcRelationship = npcInfo.relationship as NPCItemLike;
			}
		}

		this.#lastState = state;
	}

	getTimeRequired(): number {
		return MENUING_TIME;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#lastState, (draft) => {
			increaseInventoryItem(draft, this.item.id, -this.amount);
			// TODO: This use silver as temp. value for NPC relationship
			if(this.#npcRelationship){
				increaseSilver(draft, NPC_XP_MAP[this.#npcRelationship] * 20);
			}
		})
	}

	toString(): string {
		return `Give ${this.item.name} ×${this.amount} to ${this.npc}`;
	}

	collapseWith(action: Action): Action | null {
		if(action instanceof GiveToNPC && action.item.id === this.item.id && this.npc === action.npc) {
			this.amount += action.amount;
			return this;
		}
		return null;
	}

	withNewState(state: SearchState): Action {
		return new GiveToNPC(this.item, this.npc, this.amount, state);
	}
}
