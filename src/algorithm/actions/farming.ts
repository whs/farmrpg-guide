import {Action, SearchState} from "../types.ts";
import {ItemInfo} from "../../data/buddyfarm.ts";
import {produce} from "immer";
import {increaseInventoryItem} from "../utils.ts";

export class FarmPlant implements Action {
	#lastState: SearchState;
	seed: ItemInfo;
	output: ItemInfo;
	desired: number;
	// @ts-ignore
	#dropRate: number;

	constructor(seedItem: ItemInfo, outputItem: ItemInfo, desired: number, state: SearchState) {
		this.#lastState = state;
		this.desired = Math.min(this.#lastState.playerInfo.maxInventory, desired);
		this.seed = seedItem;
		this.output = outputItem;

		let foundSeed = false;
		for (let method of outputItem.dropRatesItems) {
			if (!method.dropRates.seed) {
				continue;
			}
			if (method.dropRates.seed.name !== seedItem.name) {
				continue;
			}
			this.#dropRate = method.rate;
			foundSeed = true;
			break;
		}
		if (!foundSeed) {
			throw new Error(`FarmPlant cannot find the seed of ${outputItem.name}`);
		}
	}

	toString(): string {
		return `Farm ${this.output.name} ×${this.desired}`;
	}

	getTimeRequired(): number {
		const batchesNeeded = this.getBatchesNeeded();
		return batchesNeeded * (this.output.baseYieldMinutes * (1 - this.getFarmingTimeReduction())) * 60 * 1000;
	}

	private getFarmingTimeReduction(): number {
		let perks = this.#lastState.playerInfo.perks;
		let goldPerks = this.#lastState.playerInfo.goldPerks;
		
		// Calculate the total for general, non-specific boosters
		let generalBooster = 0;
		if (perks.includes("Quicker Farming I")) {
			generalBooster += 0.05;
		}
		if (perks.includes("Quicker Farming II")) {
			generalBooster += 0.10;
		}
		if (perks.includes("Quicker Farming III")) {
			generalBooster += 0.15;
		}
		if (perks.includes("Quicker Farming IV")) {
			generalBooster += 0.20;
		}
		if (goldPerks.includes("Irrigation System I")) {
			generalBooster += 0.1;
		}
		if (goldPerks.includes("Irrigation System II")) {
			generalBooster += 0.2;
		}

		// Calculate the total for crop-specific boosters
		let cropSpecificBooster = 0;
		if (this.output.name === "Corn") {
			if (perks.includes("Quicker Corn I")) {
				cropSpecificBooster += 0.1;
			}
			if (perks.includes("Quicker Corn II")) {
				cropSpecificBooster += 0.1;
			}
		}

		// Apply the two booster categories multiplicatively
		return (1 - generalBooster) * (1 - cropSpecificBooster);
	}

	private getBatchesNeeded() {
		let doubleChance = 0;
		if (this.#lastState.playerInfo.perks.includes("Double Prizes I")) {
			doubleChance += 0.15;
		}
		if (this.#lastState.playerInfo.perks.includes("Double Prizes II")) {
			doubleChance += 0.25;
		}

		let expectedProducePerBatch = (this.#lastState.playerInfo.farmSize / this.#dropRate) * (1 + doubleChance);
		let batchesNeeded = Math.ceil(this.desired / expectedProducePerBatch);
		return batchesNeeded;
	}

	getSeedNeeded() {
		return Math.ceil(this.getBatchesNeeded() * this.#lastState.playerInfo.farmSize);
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#lastState, (draft) => {
			let batches = this.getBatchesNeeded();
			let rolls = this.#lastState.playerInfo.farmSize * batches;
			increaseInventoryItem(draft, this.seed.id, -this.getSeedNeeded());

			// Add produce
			increaseInventoryItem(draft, this.output.id, this.desired);

			// Add by products
			for (let drop of this.seed.dropRates[0].items) {
				if (drop.item.id === this.output.id) {
					// Ignore produce drop as we have hard coded rule
					continue;
				}
				increaseInventoryItem(draft, drop.item.id, Math.floor(rolls / drop.rate));
			}
		});
	}

	collapseWith(action: Action): Action | null {
		if(action instanceof FarmPlant && action.seed.id === this.seed.id && action.output.id === this.output.id) {
			this.desired = Math.min(action.#lastState.playerInfo.maxInventory, this.desired + action.desired);
			return this;
		}
		return null;
	}

	withNewState(state: SearchState): Action {
		return new FarmPlant(this.seed, this.output, this.desired, state);
	}
}
