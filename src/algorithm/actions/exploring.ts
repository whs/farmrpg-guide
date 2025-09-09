import {
	Action,
	APPLE_CIDER_ID,
	ARNOLD_PALMER_ID,
	COMPASS_ID,
	DETECTOR_ID,
	GameplayError,
	GARY_CRUSHROOM_KEY_ID,
	INFERNO_SPHERE_ID,
	LEMONADE_ID,
	ORANGE_JUICE_ID,
	SearchState
} from "../types.ts";
import {ItemInfo, LocationInfo} from "../../data/buddyfarm.ts";
import {produce} from "immer";
import {increaseInventoryItem} from "../utils.ts";

const exploreZoneLevel: Record<string, number> = {
	"Forest": 20,
	"Small Spring": 5,
	"Highland Hills": 10,
	"Cane Pole Ridge": 20,
	"Misty Forest": 30,
	"Black Rock Canyon": 40,
	"Mount Banon": 50,
	"Ember Lagoon": 60,
	"Whispering Creek": 70,
	"Jundland Desert": 80,
	"Gary's Crushroom": 90,
}

export class ExploreArea implements Action {
	area: LocationInfo;
	item: ItemInfo;
	amount: number;
	#lastState: SearchState;
	#dropRate: number = 0;

	#consumablesUsed: Map<number, number> | null = null;

	constructor(areaInfo: LocationInfo, desiredItem: ItemInfo, desiredAmount: number, state: SearchState) {
		this.area = areaInfo;
		this.item = desiredItem;
		this.amount = Math.min(state.playerInfo.maxInventory, desiredAmount);
		this.#lastState = state;

		let foundDropRate = false;
		for (let drop of areaInfo.dropRates[0].items) {
			if (drop.item.id === desiredItem.id) {
				this.#dropRate = drop.rate;
				foundDropRate = true;
				break;
			}
		}
		if (!foundDropRate) {
			throw new Error(`When exploring ${areaInfo.name} cannot find drop for ${desiredItem.name}`);
		}
	}

	toString(): string {
		return `Explore ${this.area.name} ×${Math.ceil(this.getAttemptsRequired())} — find ${this.item.name} ×${this.amount}`;
	}

	getTimeRequired(): number {
		this.#consumablesUsed = new Map<number, number>();

		let timeCost = 0;
		let attemptsLeft = this.getAttemptsRequired();
		let stamina = this.#lastState.playerInfo.maxStamina;
		const STAMINA_PER_ATTEMPT = 1;
		let staminaReduction = this.getPerksStaminaReduction();

		// Use Orange Juice first to boost stamina (100 stamina each)
		const STAMINA_PER_ORANGE_JUICE = 100;
		let orangeJuiceAvailable = this.#lastState.inventory[ORANGE_JUICE_ID];
		let orangeJuiceNeeded = Math.max(0, Math.ceil((attemptsLeft - stamina) / STAMINA_PER_ORANGE_JUICE));
		let orangeJuiceToUse = Math.min(orangeJuiceAvailable, orangeJuiceNeeded);
		if (orangeJuiceToUse > 0) {
			this.#consumablesUsed.set(ORANGE_JUICE_ID, orangeJuiceToUse);
			stamina += STAMINA_PER_ORANGE_JUICE * orangeJuiceToUse;
			timeCost += (orangeJuiceToUse / 10) * 5000;
		}

		// Use Apple Cider (1010 attempts instantly, but requires stamina)
		let appleCiderAvailable = this.#lastState.inventory[APPLE_CIDER_ID];
		let minStaminaForCider = 1010 * STAMINA_PER_ATTEMPT;
		let attemptsPerAppleCider = 1010 * STAMINA_PER_ATTEMPT;
		if (this.#lastState.playerInfo.goldPerks.includes("Cinnamon Sticks")) {
			attemptsPerAppleCider *= 1.25;
		}
		let appleCiderToUse = Math.min(appleCiderAvailable, Math.floor(Math.min(attemptsLeft, stamina) / attemptsPerAppleCider));
		if (appleCiderToUse > 0) {
			this.#consumablesUsed.set(APPLE_CIDER_ID, appleCiderToUse);
			attemptsLeft -= attemptsPerAppleCider * appleCiderToUse;
			stamina -= Math.ceil(minStaminaForCider * appleCiderToUse * (1 - staminaReduction));
			timeCost += appleCiderToUse * 500;
		}

		// Use Arnold Palmer (200 attempts instantly)
		let attemptsPerLemonade = 10;
		if (this.#lastState.playerInfo.goldPerks.includes("Lemon Squeezer")) {
			attemptsPerLemonade = 20;
		}
		let attemptsPerAP = 20 * attemptsPerLemonade;

		let arnoldPalmerAvailable = this.#lastState.inventory[ARNOLD_PALMER_ID];
		let arnoldPalmerToUse = Math.min(arnoldPalmerAvailable, Math.ceil(attemptsLeft / attemptsPerAP));
		if (arnoldPalmerToUse > 0) {
			this.#consumablesUsed.set(ARNOLD_PALMER_ID, arnoldPalmerToUse);
			attemptsLeft -= attemptsPerAP * arnoldPalmerToUse;
			timeCost += arnoldPalmerToUse * 500;
		}

		// Use Lemonade (10 attempts instantly)
		let lemonadeAvailable = this.#lastState.inventory[LEMONADE_ID];
		let lemonadeToUse = Math.min(lemonadeAvailable, Math.ceil(attemptsLeft / attemptsPerLemonade));
		if (lemonadeToUse > 0) {
			this.#consumablesUsed.set(LEMONADE_ID, lemonadeToUse);
			attemptsLeft -= attemptsPerLemonade * lemonadeToUse;
			timeCost += lemonadeToUse * 500;
		}

		// If we still have attempts left, use remaining stamina
		if (attemptsLeft <= 0) {
			return timeCost;
		}

		if (stamina >= attemptsLeft) {
			return timeCost + (attemptsLeft * 500);
		}

		attemptsLeft -= stamina;

		// Calculate regeneration time for remaining attempts
		const STAMINA_PER_CYCLE = 20;
		const CYCLE_TIME_MS = 10 * 60 * 1000; // 10 minutes
		let effectiveAttemptsPerCycle = STAMINA_PER_CYCLE / (1 - staminaReduction);
		let cyclesNeeded = Math.ceil(attemptsLeft / effectiveAttemptsPerCycle);
		timeCost += (cyclesNeeded * CYCLE_TIME_MS) + (attemptsLeft * 500)

		return timeCost;
	}

	getAttemptsRequired() {
		return this.#dropRate * this.amount;
	}

	private getPerksStaminaReduction(): number {
		let perks = this.#lastState.playerInfo.perks;
		let totalReduction = 0;
		if (perks.includes("Wanderer I")) {
			totalReduction += 0.04;
		}
		if (perks.includes("Wanderer II")) {
			totalReduction += 0.07;
		}
		if (perks.includes("Wanderer III")) {
			totalReduction += 0.09;
		}
		if (perks.includes("Wanderer IV")) {
			totalReduction += 0.13;
		}
		return totalReduction;
	}

	async nextState(): Promise<SearchState> {
		// Check prerequisites
		if (exploreZoneLevel[this.area.name] > this.#lastState.playerInfo.skills.exploring) {
			throw new GameplayError(`Area ${this.area.name} require Explore level ${exploreZoneLevel[this.area.name]}`);
		}
		if (this.area.name === "Ember Lagoon" && this.#lastState.inventory[INFERNO_SPHERE_ID] === 0) {
			throw new GameplayError("No Inferno Sphere");
		} else if (this.area.name === "Whispering Creek" && this.#lastState.inventory[COMPASS_ID] === 0) {
			throw new GameplayError("No Compass");
		} else if (this.area.name === "Jundland Desert" && this.#lastState.inventory[DETECTOR_ID] === 0) {
			throw new GameplayError("No Y73841 Detector");
		} else if (this.area.name === "Gary's Crushroom" && this.#lastState.inventory[GARY_CRUSHROOM_KEY_ID] === 0) {
			throw new GameplayError("No Gary's Crushroom Key");
		}

		return produce(this.#lastState, (draft) => {
			if (this.#consumablesUsed === null) {
				// The value is computed as side effect of this function
				this.getTimeRequired();
			}
			let attempts = this.getAttemptsRequired();

			// Remove consumed items
			for (let [item, amount] of this.#consumablesUsed!.entries()) {
				increaseInventoryItem(draft, item, -amount);
			}

			// Add target item
			increaseInventoryItem(draft, this.item.id, this.amount);

			// Add by products
			for (let drop of this.area.dropRates[0].items) {
				if (drop.item.id === this.item.id) {
					// Ignore resulting item drop
					continue;
				}
				increaseInventoryItem(draft, drop.item.id, Math.floor(attempts / drop.rate));
			}
		});
	}

	collapseWith(action: Action) {
		if(action instanceof ExploreArea && action.area.id === this.area.id && action.item.id === this.item.id) {
			this.amount = Math.min(action.#lastState.playerInfo.maxInventory, this.amount + action.amount);
			return this;
		}

		return null;
	}
}
