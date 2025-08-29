import {
	Action,
	FISHING_NET_ID,
	GameplayError,
	GRUB_ID,
	GUMMY_WORM_ID,
	LARGE_FISHING_NET_ID,
	LAVA_SPHERE_ID,
	MAPPING_COMPASS_ID,
	MEALWORM_ID,
	MINNOW_ID,
	SearchState,
	TRIBAL_MASK_ID,
	WATER_ORB_ID,
	WORM_ID
} from "../types.ts";
import {ItemInfo, LocationInfo} from "../../data/buddyfarm.ts";
import {DropRatesItem} from "../../data/types/graphql.ts";
import {produce} from "immer";
import {increaseInventoryItem} from "../utils.ts";

const fishingZoneLevel: Record<string, number> = {
	"Small Pond": 1,
	"Farm Pond": 5,
	"Forest Pond": 5,
	"Lake Tempest": 10,
	"Small Island": 20,
	"Crystal River": 30,
	"Emerald Beach": 40,
	"Vast Ocean": 50,
	"Lake Minerva": 60,
	"Large Island": 70,
	"Pirate's Cove": 80,
	"Glacier Lake": 90,
}

function checkFishingZone(area: LocationInfo, state: SearchState) {
	if (fishingZoneLevel[area.name] > state.playerInfo.skills.fishing) {
		throw new GameplayError(`Area ${area.name} requires Fishing level ${fishingZoneLevel[area.name]}`);
	}
	if (area.name === "Lake Minerva" && state.inventory[LAVA_SPHERE_ID] === 0) {
		throw new GameplayError("No Lava Sphere");
	} else if (area.name === "Large Island" && state.inventory[TRIBAL_MASK_ID] === 0) {
		throw new GameplayError("No Tribal Mask");
	} else if (area.name === "Pirate's Cove" && state.inventory[MAPPING_COMPASS_ID] === 0) {
		throw new GameplayError("No Mapping Compass");
	} else if (area.name === "Glacier Lake" && state.inventory[WATER_ORB_ID] === 0) {
		throw new GameplayError("No Water Orb");
	}
}

export class ManualFishing implements Action {
	area: LocationInfo;
	item: ItemInfo;
	amount: number;
	#lastState: SearchState;
	#dropTable: DropRatesItem[] = [];
	#dropRate: number = 0;

	constructor(areaInfo: LocationInfo, desiredItem: ItemInfo, desiredAmount: number, state: SearchState) {
		this.area = areaInfo;
		this.item = desiredItem;
		this.amount = Math.min(state.playerInfo.maxInventory, desiredAmount);
		this.#lastState = state;

		let foundDropRate = false;
		for (let dropTable of areaInfo.dropRates) {
			if (!dropTable.manualFishing) {
				continue;
			}
			this.#dropTable = dropTable.items;
			for (let drop of dropTable.items) {
				if (drop.item.id === desiredItem.id) {
					this.#dropRate = drop.rate;
					foundDropRate = true;
					break;
				}
			}
		}
		if (!foundDropRate) {
			throw new Error(`When exploring ${areaInfo.name} cannot find drop for ${desiredItem.name}`);
		}
	}

	toString(): string {
		return `Manual Fishing ${this.area.name} ×${Math.ceil(this.getAttemptsRequired())} for ${this.item.name} ×${this.amount}`;
	}

	getTimeRequired(): number {
		let rollsNeeded = this.getAttemptsRequired();
		let mealwormRolls = Math.min(rollsNeeded, this.#lastState.inventory[MEALWORM_ID]);
		let rollsLeft = rollsNeeded - mealwormRolls;
		// 500ms for each mealworm, 5s for other baits
		return Math.ceil((mealwormRolls * 500) + (rollsLeft * 5000));
	}

	getAttemptsRequired() {
		return this.#dropRate * this.amount;
	}

	async nextState(): Promise<SearchState> {
		checkFishingZone(this.area, this.#lastState);

		return produce(this.#lastState, (draft) => {
			draft.inventory = this.#lastState.inventory.slice();

			let rollsNeeded = this.getAttemptsRequired();
			let rollCount = 0;
			let baits = [MEALWORM_ID, GUMMY_WORM_ID, GRUB_ID, MINNOW_ID, WORM_ID];

			for (let bait of baits) {
				let usedBait = Math.min(rollsNeeded - rollCount, this.#lastState.inventory[bait]);
				increaseInventoryItem(draft.inventory, bait, -usedBait, this.#lastState.playerInfo.maxInventory);
				rollCount += usedBait;

				if (rollCount >= rollsNeeded) {
					break;
				}
			}

			if (rollCount >= rollsNeeded) {
				// Guaranteed drop
				increaseInventoryItem(
					draft.inventory,
					this.item.id,
					this.amount,
					this.#lastState.playerInfo.maxInventory,
				);
			} else {
				// Partial drop
				increaseInventoryItem(
					draft.inventory,
					this.item.id,
					Math.floor(rollCount / this.#dropRate),
					this.#lastState.playerInfo.maxInventory,
				);
			}

			// Add by products
			for (let drop of this.#dropTable) {
				if (drop.item.id === this.item.id) {
					// Ignore resulting item drop
					continue;
				}
				increaseInventoryItem(
					draft.inventory,
					drop.item.id,
					Math.floor(rollCount / drop.rate),
					this.#lastState.playerInfo.maxInventory,
				);
			}
		});
	}
}

export class NetFishing implements Action {
	area: LocationInfo;
	item: ItemInfo;
	amount: number;
	#lastState: SearchState;
	#dropTable: DropRatesItem[] = [];
	#dropRate: number = 0;

	constructor(areaInfo: LocationInfo, desiredItem: ItemInfo, desiredAmount: number, state: SearchState) {
		this.area = areaInfo;
		this.item = desiredItem;
		this.amount = Math.min(state.playerInfo.maxInventory, desiredAmount);
		this.#lastState = state;

		let foundDropRate = false;
		for (let dropTable of areaInfo.dropRates) {
			if (dropTable.manualFishing) {
				continue;
			}
			this.#dropTable = dropTable.items;
			for (let drop of dropTable.items) {
				if (drop.item.id === desiredItem.id) {
					this.#dropRate = drop.rate;
					foundDropRate = true;
					break;
				}
			}
		}
		if (!foundDropRate) {
			throw new Error(`When exploring ${areaInfo.name} cannot find drop for ${desiredItem.name}`);
		}
	}

	toString(): string {
		return `Net Fishing ${this.area.name} ×${Math.ceil(this.getAttemptsRequired() / this.getRollPerNet())} for ${this.item.name} ×${this.amount}`;
	}

	getRollPerNet(): number {
		if (this.#lastState.playerInfo.goldPerks.includes("Reinforced Netting")) {
			return 15;
		}

		return 10;
	}

	getTimeRequired(): number {
		let rollsNeeded = this.getAttemptsRequired() / this.getRollPerNet();
		// 300 ms per net use - rough estimation without addressing large nets
		return Math.ceil(rollsNeeded * 300);
	}

	getAttemptsRequired() {
		return this.#dropRate * this.amount;
	}

	async nextState(): Promise<SearchState> {
		checkFishingZone(this.area, this.#lastState);

		return produce(this.#lastState, (draft) => {
			draft.inventory = this.#lastState.inventory.slice();

			let rollsNeeded = this.getAttemptsRequired();
			let actualRolls = 0;
			let rollsPerNet = this.getRollPerNet();
			let rollsPerLargeNet = 25 * rollsPerNet;

			// Try large net
			// We have to use all large nets first as we can't use small nets when we have large nets
			if (this.#lastState.inventory[LARGE_FISHING_NET_ID] > 0) {
				let largeNetUsed = Math.ceil(rollsNeeded / rollsPerLargeNet);
				largeNetUsed = Math.min(largeNetUsed, this.#lastState.inventory[LARGE_FISHING_NET_ID]);
				actualRolls += largeNetUsed * rollsPerLargeNet;
				draft.inventory[LARGE_FISHING_NET_ID] -= largeNetUsed;
			}

			// Try small net
			if (this.#lastState.inventory[FISHING_NET_ID] > 0) {
				let netUsed = Math.ceil(rollsNeeded / rollsPerNet);
				netUsed = Math.min(netUsed, this.#lastState.inventory[FISHING_NET_ID]);
				actualRolls += netUsed * rollsPerNet;
				draft.inventory[FISHING_NET_ID] -= netUsed;
			}

			if (actualRolls >= rollsNeeded) {
				// Guaranteed drop
				increaseInventoryItem(
					draft.inventory,
					this.item.id,
					this.amount,
					this.#lastState.playerInfo.maxInventory,
				);
			} else {
				// Partial drop
				increaseInventoryItem(
					draft.inventory,
					this.item.id,
					Math.floor(actualRolls / this.#dropRate),
					this.#lastState.playerInfo.maxInventory,
				);
			}

			// Add by products
			for (let drop of this.#dropTable) {
				if (drop.item.id === this.item.id) {
					// Ignore resulting item drop
					continue;
				}
				increaseInventoryItem(
					draft.inventory,
					drop.item.id,
					Math.floor(actualRolls / drop.rate),
					this.#lastState.playerInfo.maxInventory,
				);
			}
		});
	}
}