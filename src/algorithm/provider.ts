import {enableMapSet, produce, WritableDraft} from "immer";
import {
	APPLE_CIDER_ID,
	APPLE_ID,
	ARNOLD_PALMER_ID,
	BOARD_ID,
	COAL_ID,
	COMPASS_ID,
	DETECTOR_ID,
	EGGS_ID,
	FEATHERS_ID,
	FEED_ID,
	FISHING_NET_ID, FLOUR_ID, GameplayError, GARY_CRUSHROOM_KEY_ID, GRAPES_ID, GRUB_ID, GUMMY_WORM_ID, INFERNO_SPHERE_ID, IRON_ID,
	LARGE_FISHING_NET_ID,
	LAVA_SPHERE_ID,
	LEMON_ID,
	LEMONADE_ID, MAPPING_COMPASS_ID, MEALWORM_ID, MILK_ID, MINNOW_ID, NAILS_ID,
	ORANGE_ID,
	ORANGE_JUICE_ID,
	Provider,
	SearchState, STEAK_ID, STEAK_KABOB_ID, STONE_ID, STRAW_ID, TRIBAL_MASK_ID, WATER_ORB_ID, WHEAT_ID, WOOD_ID, WORM_ID
} from "./types.ts";
import {getItemInfo, ItemInfo, LocationInfo, QuestInfo} from "../data/buddyfarm.ts";
import {DropRatesItem} from "src/data/types/graphql.ts";
import { getTimeUntilNextReset } from "./utils.ts";

enableMapSet()

const MENUING_TIME = 30000;

function increaseInventoryItem(inventory: WritableDraft<Uint16Array>, itemId: number, amount: number, maxInventory: number){
	if(!itemId){
		throw new Error("Missing itemId");
	}
	let newValue = Math.min(inventory[itemId] + amount, maxInventory);
	if (newValue < 0){
		throw new GameplayError(`attempting to add item ${itemId} by ${amount} but only have ${inventory[itemId]}`)
	}
	inventory[itemId] = newValue;
}

function increaseSilver(state: WritableDraft<SearchState>, amount: number){
	let lastSilver = state.silver;
	state.silver += amount;
	if (state.silver < 0){
		throw new GameplayError(`attempting to remove silver by ${amount} but only have ${lastSilver}`)
	}
}

export class SubmitQuest implements Provider {
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
		let requiredItems = await Promise.all(this.quest.requiredItems.map(async (item) => ({info: await getItemInfo(item.item.name), item})));
		let rewardItems = await Promise.all(this.quest.rewardItems.map(async (item) => ({info: await getItemInfo(item.item.name), item})));

		return produce(this.#lastState, (draft) => {
			draft.inventory = draft.inventory.slice();

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

			let index = draft.objectives.findIndex((q) => q.quest?.name === this.quest.name);
			if (index === -1){
				throw new Error("quest not found");
			}
			let quest = draft.objectives[index];
			draft.objectives.splice(index, 1);
			draft.completedObjectives.push(quest);
		});
	}

	toString(): string{
		return `Submit Quest ${this.quest.name}`;
	}
}

export class FarmPlant implements Provider {
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
		for(let method of outputItem.dropRatesItems) {
			if(!method.dropRates.seed) {
				continue;
			}
			if(method.dropRates.seed.name !== seedItem.name) {
				continue;
			}
			this.#dropRate = method.rate;
			foundSeed = true;
			break;
		}
		if(!foundSeed) {
			throw new Error(`FarmPlant cannot find the seed of ${outputItem.name}`);
		}
	}

	toString(): string{
		return `Farm ${this.output.name} ×${this.desired}`;
	}

	getTimeRequired(): number {
		const batchesNeeded = this.getBatchesNeeded();
		return batchesNeeded * (this.output.baseYieldMinutes * (1-this.getFarmingTimeReduction())) * 60 * 1000;
	}

	private getFarmingTimeReduction(): number {
		let perks = this.#lastState.playerInfo.perks;
		let goldPerks = this.#lastState.playerInfo.goldPerks;
		let booster = 0;
		if(perks.includes("Quicker Farming I")) {
			booster += 0.05;
		}
		if(perks.includes("Quicker Farming II")) {
			booster += 0.10;
		}
		if(perks.includes("Quicker Farming III")) {
			booster += 0.15;
		}
		if(perks.includes("Quicker Farming IV")) {
			booster += 0.20;
		}
		if(goldPerks.includes("Irrigation System I")) {
			booster += 0.1;
		}
		if(goldPerks.includes("Irrigation System II")) {
			booster += 0.2;
		}
		if(this.output.name === "Corn"){
			if(perks.includes("Quicker Corn I")) {
				booster += 0.1;
			}
			if(perks.includes("Quicker Corn II")) {
				booster += 0.1;
			}
		}
		return booster;
	}

	private getBatchesNeeded() {
		let doubleChance = 0;
		if(this.#lastState.playerInfo.perks.includes("Double Prizes I")){
			doubleChance += 0.15;
		}
		if(this.#lastState.playerInfo.perks.includes("Double Prizes II")){
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
			draft.inventory = draft.inventory.slice();
			let batches = this.getBatchesNeeded();
			let rolls = this.#lastState.playerInfo.farmSize * batches;
			increaseInventoryItem(
				draft.inventory,
				this.seed.id,
				-this.getSeedNeeded(),
				this.#lastState.playerInfo.maxInventory
			);

			// Add produce
			increaseInventoryItem(
				draft.inventory,
				this.output.id,
				this.desired,
				this.#lastState.playerInfo.maxInventory
			);

			// Add by products
			for(let drop of this.seed.dropRates[0].items){
				if(drop.item.id === this.output.id) {
					// Ignore produce drop as we have hard coded rule
					continue;
				}
				increaseInventoryItem(
					draft.inventory,
					drop.item.id,
					Math.floor(rolls / drop.rate),
					this.#lastState.playerInfo.maxInventory
				);
			}
		});
	}
}

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

export class ExploreArea implements Provider {
	area: LocationInfo;
	item: ItemInfo;
	amount: number;
	#lastState: SearchState;
	#dropRate: number = 0;

	#consumablesUsed: Map<number, number>|null = null;

	constructor(areaInfo: LocationInfo, desiredItem: ItemInfo, desiredAmount: number, state: SearchState) {
		this.area = areaInfo;
		this.item = desiredItem;
		this.amount = Math.min(state.playerInfo.maxInventory, desiredAmount);
		this.#lastState = state;

		let foundDropRate = false;
		for(let drop of areaInfo.dropRates[0].items){
			if(drop.item.id === desiredItem.id){
				this.#dropRate = drop.rate;
				foundDropRate = true;
				break;
			}
		}
		if(!foundDropRate){
			throw new Error(`When exploring ${areaInfo.name} cannot find drop for ${desiredItem.name}`);
		}
	}

	toString(): string{
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
			timeCost += (orangeJuiceToUse/10) * 5000;
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
		if(perks.includes("Wanderer I")) {
			totalReduction += 0.04;
		}
		if(perks.includes("Wanderer II")) {
			totalReduction += 0.07;
		}
		if(perks.includes("Wanderer III")) {
			totalReduction += 0.09;
		}
		if(perks.includes("Wanderer IV")) {
			totalReduction += 0.13;
		}
		return totalReduction;
	}

	async nextState(): Promise<SearchState> {
		// Check prerequisites
		if(exploreZoneLevel[this.area.name] > this.#lastState.playerInfo.skills.exploring){
			throw new GameplayError(`Area ${this.area.name} require Explore level ${exploreZoneLevel[this.area.name]}`);
		}
		if(this.area.name === "Ember Lagoon" && this.#lastState.inventory[INFERNO_SPHERE_ID] === 0) {
			throw new GameplayError("No Inferno Sphere");
		}else if(this.area.name === "Whispering Creek" && this.#lastState.inventory[COMPASS_ID] === 0) {
			throw new GameplayError("No Compass");
		}else if(this.area.name === "Jundland Desert" && this.#lastState.inventory[DETECTOR_ID] === 0) {
			throw new GameplayError("No Y73841 Detector");
		}else if(this.area.name === "Gary's Crushroom" && this.#lastState.inventory[GARY_CRUSHROOM_KEY_ID] === 0) {
			throw new GameplayError("No Gary's Crushroom Key");
		}
		
		return produce(this.#lastState, (draft) => {
			draft.inventory = draft.inventory.slice();
			if(this.#consumablesUsed === null){
				// The value is computed as side effect of this function
				this.getTimeRequired();
			}
			let attempts = this.getAttemptsRequired();

			// Remove consumed items
			for (let [item, amount] of this.#consumablesUsed!.entries()) {
				increaseInventoryItem(
					draft.inventory,
					item,
					-amount,
					this.#lastState.playerInfo.maxInventory,
				)
			}

			// Add target item
			increaseInventoryItem(
				draft.inventory,
				this.item.id,
				this.amount,
				this.#lastState.playerInfo.maxInventory,
			);

			// Add by products
			for(let drop of this.area.dropRates[0].items){
				if(drop.item.id === this.item.id){
					// Ignore resulting item drop
					continue;
				}
				increaseInventoryItem(
					draft.inventory,
					drop.item.id,
					Math.floor(attempts / drop.rate),
					this.#lastState.playerInfo.maxInventory,
				);
			}
		});
	}
}

export class BuyItemStore implements Provider {
	item: ItemInfo;
	amount: number;
	#lastState: SearchState;

	constructor(item: ItemInfo, amount: number, state: SearchState) {
		if(!item.canBuy){
			throw new Error(`Cannot buy item ${item.name}`);
		}
		this.item = item;
		this.amount = Math.min(state.playerInfo.maxInventory, amount);
		this.#lastState = state;
	}

	getTimeRequired(): number {
		if(this.#lastState.playerInfo.goldPerks.includes("Iron Depot") && [IRON_ID, NAILS_ID].includes(this.item.id)){
			return 0;
		}
		return MENUING_TIME;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#lastState, (draft) => {
			draft.inventory = draft.inventory.slice();

			increaseSilver(draft, -(this.item.buyPrice * this.amount));

			increaseInventoryItem(draft.inventory, this.item.id, this.amount, draft.playerInfo.maxInventory);
		})
	}

	toString(): string {
		return `Buy ${this.item.name} ×${this.amount}`;
	}
}

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
	if(area.name === "Lake Minerva" && state.inventory[LAVA_SPHERE_ID] === 0) {
		throw new GameplayError("No Lava Sphere");
	}else if(area.name === "Large Island" && state.inventory[TRIBAL_MASK_ID] === 0){
		throw new GameplayError("No Tribal Mask");
	}else if(area.name === "Pirate's Cove" && state.inventory[MAPPING_COMPASS_ID] === 0){
		throw new GameplayError("No Mapping Compass");
	}else if(area.name === "Glacier Lake" && state.inventory[WATER_ORB_ID] === 0){
		throw new GameplayError("No Water Orb");
	}
}

export class ManualFishing implements Provider {
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
		for(let dropTable of areaInfo.dropRates) {
			if(!dropTable.manualFishing) {
				continue;
			}
			this.#dropTable = dropTable.items;
			for(let drop of dropTable.items){
				if(drop.item.id === desiredItem.id){
					this.#dropRate = drop.rate;
					foundDropRate = true;
					break;
				}
			}
		}
		if(!foundDropRate){
			throw new Error(`When exploring ${areaInfo.name} cannot find drop for ${desiredItem.name}`);
		}
	}

	toString(): string{
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
			draft.inventory = draft.inventory.slice();

			let rollsNeeded = this.getAttemptsRequired();
			let rollCount = 0;
			let baits = [MEALWORM_ID, GUMMY_WORM_ID, GRUB_ID, MINNOW_ID, WORM_ID];

			for(let bait of baits){
				let usedBait = Math.min(rollsNeeded - rollCount, this.#lastState.inventory[bait]);
				increaseInventoryItem(draft.inventory, bait, -usedBait, this.#lastState.playerInfo.maxInventory);
				rollCount += usedBait;

				if(rollCount >= rollsNeeded){
					break;
				}
			}

			if(rollCount >= rollsNeeded) {
				// Guaranteed drop
				increaseInventoryItem(
					draft.inventory,
					this.item.id,
					this.amount,
					this.#lastState.playerInfo.maxInventory,
				);
			}else{
				// Partial drop
				increaseInventoryItem(
					draft.inventory,
					this.item.id,
					Math.floor(rollCount / this.#dropRate),
					this.#lastState.playerInfo.maxInventory,
				);
			}

			// Add by products
			for(let drop of this.#dropTable){
				if(drop.item.id === this.item.id){
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

export class NetFishing implements Provider {
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
		for(let dropTable of areaInfo.dropRates) {
			if(dropTable.manualFishing) {
				continue;
			}
			this.#dropTable = dropTable.items;
			for(let drop of dropTable.items){
				if(drop.item.id === desiredItem.id){
					this.#dropRate = drop.rate;
					foundDropRate = true;
					break;
				}
			}
		}
		if(!foundDropRate){
			throw new Error(`When exploring ${areaInfo.name} cannot find drop for ${desiredItem.name}`);
		}
	}

	toString(): string{
		return `Net Fishing ${this.area.name} ×${Math.ceil(this.getAttemptsRequired()/this.getRollPerNet())} for ${this.item.name} ×${this.amount}`;
	}

	getRollPerNet(): number {
		if(this.#lastState.playerInfo.goldPerks.includes("Reinforced Netting")) {
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
			draft.inventory = draft.inventory.slice();
			
			let rollsNeeded = this.getAttemptsRequired();
			let actualRolls = 0;
			let rollsPerNet = this.getRollPerNet();
			let rollsPerLargeNet = 25 * rollsPerNet;
			
			// Try large net
			// We have to use all large nets first as we can't use small nets when we have large nets
			if(draft.inventory[LARGE_FISHING_NET_ID] > 0){
				let largeNetUsed = Math.ceil(rollsNeeded/rollsPerLargeNet);
				largeNetUsed = Math.min(largeNetUsed, draft.inventory[LARGE_FISHING_NET_ID]);
				actualRolls += largeNetUsed * rollsPerLargeNet;
				draft.inventory[LARGE_FISHING_NET_ID] -= largeNetUsed;
			}

			// Try small net
			if(draft.inventory[FISHING_NET_ID] > 0){
				let netUsed = Math.ceil(rollsNeeded/rollsPerNet);
				netUsed = Math.min(netUsed, draft.inventory[FISHING_NET_ID]);
				actualRolls += netUsed * rollsPerNet;
				draft.inventory[FISHING_NET_ID] -= netUsed;
			}

			if(actualRolls >= rollsNeeded) {
				// Guaranteed drop
				increaseInventoryItem(
					draft.inventory,
					this.item.id,
					this.amount,
					this.#lastState.playerInfo.maxInventory,
				);
			}else{
				// Partial drop
				increaseInventoryItem(
					draft.inventory,
					this.item.id,
					Math.floor(actualRolls / this.#dropRate),
					this.#lastState.playerInfo.maxInventory,
				);
			}

			// Add by products
			for(let drop of this.#dropTable){
				if(drop.item.id === this.item.id){
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

export class CraftItem implements Provider {
	item: ItemInfo;
	amount: number;
	craftTimes: number;
	#lastState: SearchState;

	constructor(item: ItemInfo, desiredAmount: number, state: SearchState) {
		this.item = item;
		if(!this.item.canCraft) {
			throw new Error(`Item ${item.name} is not craftable`);
		}
		this.#lastState = state;
		const maxCraftable = this.getCraftableAmount(desiredAmount);
		this.amount = Math.min(state.playerInfo.maxInventory, maxCraftable);

		let resourceSaverBonus = 0;
		if(state.playerInfo.perks.includes("Resource Saver I")) {
			resourceSaverBonus += 0.1;
		}
		if(state.playerInfo.goldPerks.includes("Resource Saver II")) {
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

	toString(): string{
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
			draft.inventory = draft.inventory.slice();

			for(let item of this.item.recipeItems){
				increaseInventoryItem(draft.inventory, item.item.id, -(this.craftTimes * item.quantity), this.#lastState.playerInfo.maxInventory);
			}

			increaseInventoryItem(draft.inventory, this.item.id, this.amount, this.#lastState.playerInfo.maxInventory);
		});
	}
}

export class FlourMill implements Provider {
	#amount: number;
	#state: SearchState;
	
	constructor(desiredAmount: number, state: SearchState) {
		this.#amount = Math.min(state.playerInfo.maxInventory, desiredAmount);
		this.#state = state;
	}

	#getFlourPerMinute(): number {
		if(this.#state.playerInfo.goldPerks.includes("Flour Power")) {
			return 2;
		}

		return 1;
	}

	toString(): string{
		return `Produce Flour ×${this.#amount}`;
	}

	getTimeRequired(): number {
		return (this.#amount / this.#getFlourPerMinute()) * 60000;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			draft.inventory = draft.inventory.slice();
			increaseInventoryItem(draft.inventory, WHEAT_ID, -Math.ceil(this.#amount/14.4), this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, FLOUR_ID, this.#amount, this.#state.playerInfo.maxInventory);
		});
	}
}

export class FeedMill implements Provider {
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
		if(this.#state.playerInfo.goldPerks.includes("Feed Boost")) {
			return 2;
		}

		return 1;
	}

	toString(): string{
		return `Produce Feed ×${this.#amount} from ${this.#input.name}`;
	}

	getTimeRequired(): number {
		return (this.#amount / this.#getFeedPerMinute()) * 60000;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			draft.inventory = draft.inventory.slice();
			let producePerInput = FeedMill.feedTable[this.#input.name];
			let inputRequired = Math.ceil(this.#amount / producePerInput);
			increaseInventoryItem(draft.inventory, this.#input.id, -inputRequired, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, FEED_ID, this.#amount, this.#state.playerInfo.maxInventory);
		});
	}
}

export class WaitForReset implements Provider {
	#state: SearchState

	constructor(state: SearchState){
		this.#state = state;
	}

	getTimeRequired(): number {
		if(this.#state.waitedForReset) {
			return 24 * 60 * 60000;
		}

		return getTimeUntilNextReset();
	}
	
	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			draft.inventory = draft.inventory.slice();
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


export class WaitForHourly implements Provider {
	#state: SearchState

	constructor(state: SearchState){
		this.#state = state;
	}

	getTimeRequired(): number {
		return 60*60000;
	}
	
	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			draft.inventory = draft.inventory.slice();
			increaseInventoryItem(draft.inventory, BOARD_ID, this.#state.playerInfo.sawmillBoard, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, WOOD_ID, this.#state.playerInfo.sawmillWood, this.#state.playerInfo.maxInventory);
		})
	}
	
	toString(): string {
		return "Wait for next hour"
	}
}

export class WaitFor10Min implements Provider {
	#state: SearchState

	constructor(state: SearchState){
		this.#state = state;
	}

	getTimeRequired(): number {
		return 10*60000;
	}
	
	async nextState(): Promise<SearchState> {
		return produce(this.#state, (draft) => {
			draft.inventory = draft.inventory.slice();
			increaseInventoryItem(draft.inventory, STRAW_ID, this.#state.playerInfo.hayfieldStraw, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, STONE_ID, this.#state.playerInfo.quarryStone, this.#state.playerInfo.maxInventory);
			increaseInventoryItem(draft.inventory, COAL_ID, this.#state.playerInfo.quarryCoal, this.#state.playerInfo.maxInventory);
		})
	}
	
	toString(): string {
		return "Wait for 10 minutes"
	}
}

export class BuySteak implements Provider {
	#state: SearchState
	amount: number;

	constructor(amount: number, state: SearchState){
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
			draft.inventory = draft.inventory.slice();
			increaseInventoryItem(draft.inventory, STEAK_ID, this.amount, this.#state.playerInfo.maxInventory);
		})
	}
	
	toString(): string {
		return "Buy Steak ×${this.#amount}"
	}
}

export class BuySteakKabob implements Provider {
	#state: SearchState
	amount: number;

	constructor(amount: number, state: SearchState){
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
			draft.inventory = draft.inventory.slice();
			increaseInventoryItem(draft.inventory, STEAK_KABOB_ID, this.amount, this.#state.playerInfo.maxInventory);
		})
	}
	
	toString(): string {
		return "Buy Steak Kabob ×${this.#amount}"
	}
}
