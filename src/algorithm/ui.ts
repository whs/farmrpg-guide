import {Action, SearchState, STEAK_ID, STEAK_KABOB_ID} from "./types.ts";
import {increaseInventoryItem, increaseSilver, MENUING_TIME} from "./utils.ts";
import {produce} from "immer";

export class BuySteak implements Action {
	#state: SearchState
	amount: number;

	constructor(amount: number, state: SearchState) {
		this.amount = amount;
		this.#state = state;
	}

	getTimeRequired(): number {
		return MENUING_TIME;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			// Bill for max price
			increaseSilver(draft, 75000 * this.amount)
			increaseInventoryItem(draft, STEAK_ID, this.amount);
		})
	}

	toString(): string {
		return `Buy Steak ×${this.amount}`
	}

	withNewState(state: SearchState): Action {
		return new BuySteak(this.amount, state);
	}
}

export class BuySteakKabob implements Action {
	#state: SearchState
	amount: number;

	constructor(amount: number, state: SearchState) {
		this.amount = amount;
		this.#state = state;
	}

	getTimeRequired(): number {
		return MENUING_TIME;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			// Bill for max price
			increaseSilver(draft, 12000 * this.amount)
			increaseInventoryItem(draft, STEAK_KABOB_ID, this.amount);
		})
	}

	toString(): string {
		return `Buy Steak Kabob ×${this.amount}`
	}

	withNewState(state: SearchState): Action {
		return new BuySteakKabob(this.amount, state);
	}
}
