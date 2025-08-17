import {enableMapSet, produce, WritableDraft} from "immer";
import {
	APPLE_CIDER_ID,
	ARNOLD_PALMER_ID,
	FISHING_NET_ID, GameplayError, GRUB_ID, GUMMY_WORM_ID, IRON_ID,
	LARGE_FISHING_NET_ID,
	LEMONADE_ID, MEALWORM_ID, MINNOW_ID, NAILS_ID,
	ORANGE_JUICE_ID,
	Provider,
	SearchState, WORM_ID
} from "./types.ts";
import {getItemInfo, ItemInfo, LocationInfo, QuestInfo} from "../data/buddyfarm.ts";
import {DropRatesItem} from "src/data/types/graphql.ts";

enableMapSet()

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
	#quest: QuestInfo;

	constructor(quest: QuestInfo, state: SearchState) {
		this.#lastState = state;
		this.#quest = quest;
	}

	getTimeRequired(): number {
		return 10000;
	}

	async nextState(): Promise<SearchState> {
		let requiredItems = await Promise.all(this.#quest.requiredItems.map(async (item) => ({info: await getItemInfo(item.item.name), item})));
		let rewardItems = await Promise.all(this.#quest.rewardItems.map(async (item) => ({info: await getItemInfo(item.item.name), item})));

		return produce(this.#lastState, (draft) => {
			draft.inventory = draft.inventory.slice();

			increaseSilver(draft, -(this.#quest.requiredSilver || 0));
			increaseSilver(draft, this.#quest.rewardSilver);

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

			let index = draft.objectives.findIndex((q) => q.quest?.name === this.#quest.name);
			if (index === -1){
				throw new Error("quest not found");
			}
			let quest = draft.objectives[index];
			draft.objectives.splice(index, 1);
			draft.completedObjectives.push(quest);
		});
	}

	toString(): string{
		return `Submit Quest ${this.#quest.name}`;
	}
}

export class FarmPlant implements Provider {
	#lastState: SearchState;
	#seed: ItemInfo;
	#output: ItemInfo;
	#desired: number;
	// @ts-ignore
	#dropRate: number;

	constructor(seedItem: ItemInfo, outputItem: ItemInfo, desired: number, state: SearchState) {
		this.#lastState = state;
		this.#desired = Math.min(this.#lastState.playerInfo.maxInventory, desired);
		this.#seed = seedItem;
		this.#output = outputItem;

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
		return `Farm ${this.#output.name} x ${this.#desired}`;
	}

	getTimeRequired(): number {
		const batchesNeeded = this.getBatchesNeeded();
		return batchesNeeded * this.#output.baseYieldMinutes * 60 * 1000;
	}

	private getBatchesNeeded() {
		const expectedProducePerBatch = this.#lastState.playerInfo.farmSize / this.#dropRate;
		const batchesNeeded = Math.ceil(this.#desired / expectedProducePerBatch);
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
				this.#seed.id,
				-this.getSeedNeeded(),
				this.#lastState.playerInfo.maxInventory
			);

			// Add produce
			increaseInventoryItem(
				draft.inventory,
				this.#output.id,
				this.#desired,
				this.#lastState.playerInfo.maxInventory
			);

			// Add by products
			for(let drop of this.#seed.dropRates[0].items){
				if(drop.item.id === this.#output.id) {
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

export class ExploreArea implements Provider {
	#area: LocationInfo;
	#item: ItemInfo;
	#amount: number;
	#lastState: SearchState;
	#dropRate: number = 0;

	#consumablesUsed: Map<number, number>|null = null;

	constructor(areaInfo: LocationInfo, desiredItem: ItemInfo, desiredAmount: number, state: SearchState) {
		this.#area = areaInfo;
		this.#item = desiredItem;
		this.#amount = Math.min(state.playerInfo.maxInventory, desiredAmount);
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
		return `Explore ${this.#area.name} x ${Math.ceil(this.getAttemptsRequired())} to find ${this.#item.name} x ${this.#amount}`;
	}

	getTimeRequired(): number {
		this.#consumablesUsed = new Map<number, number>();

		let timeCost = 0;
		let attemptsLeft = this.getAttemptsRequired();
		let stamina = this.#lastState.playerInfo.maxStamina;
		const STAMINA_PER_ATTEMPT = 1;
		
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
		const ATTEMPTS_PER_APPLE_CIDER = 1010 * STAMINA_PER_ATTEMPT;
		let appleCiderToUse = Math.min(appleCiderAvailable, Math.floor(Math.min(attemptsLeft, stamina) / ATTEMPTS_PER_APPLE_CIDER));
		if (appleCiderToUse > 0) {
			this.#consumablesUsed.set(APPLE_CIDER_ID, appleCiderToUse);
			attemptsLeft -= ATTEMPTS_PER_APPLE_CIDER * appleCiderToUse;
			stamina -= ATTEMPTS_PER_APPLE_CIDER * appleCiderToUse;
			timeCost += appleCiderToUse * 500;
		}
		
		// Use Arnold Palmer (200 attempts instantly)
		const ATTEMPTS_PER_LEMONADE = 10;
		const ATTEMPTS_PER_AP = 20 * ATTEMPTS_PER_LEMONADE;
		let arnoldPalmerAvailable = this.#lastState.inventory[ARNOLD_PALMER_ID];
		let arnoldPalmerToUse = Math.min(arnoldPalmerAvailable, Math.ceil(attemptsLeft / ATTEMPTS_PER_AP));
		if (arnoldPalmerToUse > 0) {
			this.#consumablesUsed.set(ARNOLD_PALMER_ID, arnoldPalmerToUse);
			attemptsLeft -= ATTEMPTS_PER_AP * arnoldPalmerToUse;
			timeCost += arnoldPalmerToUse * 500;
		}
		
		// Use Lemonade (10 attempts instantly)
		let lemonadeAvailable = this.#lastState.inventory[LEMONADE_ID];
		let lemonadeToUse = Math.min(lemonadeAvailable, Math.ceil(attemptsLeft / ATTEMPTS_PER_LEMONADE));
		if (lemonadeToUse > 0) {
			this.#consumablesUsed.set(LEMONADE_ID, lemonadeToUse);
			attemptsLeft -= ATTEMPTS_PER_LEMONADE * lemonadeToUse;
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
		let cyclesNeeded = Math.ceil(attemptsLeft / STAMINA_PER_CYCLE);
		timeCost += (cyclesNeeded * CYCLE_TIME_MS) + (attemptsLeft * 500)
		
		return timeCost;
	}

	private getAttemptsRequired() {
		return this.#dropRate * this.#amount;
	}

	async nextState(): Promise<SearchState> {
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
				this.#item.id,
				this.#amount,
				this.#lastState.playerInfo.maxInventory,
			);

			// Add by products
			for(let drop of this.#area.dropRates[0].items){
				if(drop.item.id === this.#item.id){
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
	#item: ItemInfo;
	#amount: number;
	#lastState: SearchState;

	constructor(item: ItemInfo, amount: number, state: SearchState) {
		if(!item.canBuy){
			throw new Error(`Cannot buy item ${item.name}`);
		}
		this.#item = item;
		this.#amount = Math.min(state.playerInfo.maxInventory, amount);
		this.#lastState = state;
	}

	getTimeRequired(): number {
		// TODO: Check perk
		if([IRON_ID, NAILS_ID].includes(this.#item.id)){
			return 0;
		}
		return 10000;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#lastState, (draft) => {
			draft.inventory = draft.inventory.slice();

			increaseSilver(draft, -(this.#item.buyPrice * this.#amount));

			increaseInventoryItem(draft.inventory, this.#item.id, this.#amount, draft.playerInfo.maxInventory);
		})
	}

	toString(): string {
		return `Buy ${this.#item.name} x ${this.#amount} from Country Store`;
	}
}

export class ManualFishing implements Provider {
	#area: LocationInfo;
	#item: ItemInfo;
	#amount: number;
	#lastState: SearchState;
	#dropTable: DropRatesItem[] = [];
	#dropRate: number = 0;

	constructor(areaInfo: LocationInfo, desiredItem: ItemInfo, desiredAmount: number, state: SearchState) {
		this.#area = areaInfo;
		this.#item = desiredItem;
		this.#amount = Math.min(state.playerInfo.maxInventory, desiredAmount);
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
		return `Manual Fishing ${this.#area.name} x ${Math.ceil(this.getAttemptsRequired()/10)} to find ${this.#item.name}`;
	}

	getTimeRequired(): number {
		let rollsNeeded = this.getAttemptsRequired();
		let mealwormRolls = Math.min(rollsNeeded, this.#lastState.inventory[MEALWORM_ID]);
		let rollsLeft = rollsNeeded - mealwormRolls;
		// 500ms for each mealworm, 5s for other baits
		return Math.ceil((mealwormRolls * 500) + (rollsLeft * 5000));
	}

	private getAttemptsRequired() {
		return this.#dropRate * this.#amount;
	}

	async nextState(): Promise<SearchState> {
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
					this.#item.id,
					this.#amount,
					this.#lastState.playerInfo.maxInventory,
				);
			}else{
				// Partial drop
				increaseInventoryItem(
					draft.inventory,
					this.#item.id,
					Math.floor(rollCount / this.#dropRate),
					this.#lastState.playerInfo.maxInventory,
				);
			}

			// Add by products
			for(let drop of this.#dropTable){
				if(drop.item.id === this.#item.id){
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
	#area: LocationInfo;
	#item: ItemInfo;
	#amount: number;
	#lastState: SearchState;
	#dropTable: DropRatesItem[] = [];
	#dropRate: number = 0;

	constructor(areaInfo: LocationInfo, desiredItem: ItemInfo, desiredAmount: number, state: SearchState) {
		this.#area = areaInfo;
		this.#item = desiredItem;
		this.#amount = Math.min(state.playerInfo.maxInventory, desiredAmount);
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
		return `Net Fishing ${this.#area.name} x ${Math.ceil(this.getAttemptsRequired()/10)} to find ${this.#item.name}`;
	}

	getTimeRequired(): number {
		let rollsNeeded = this.getAttemptsRequired() / 10;
		// 300 ms per net use - rough estimation without addressing large nets
		return Math.ceil(rollsNeeded * 300);
	}

	private getAttemptsRequired() {
		return this.#dropRate * this.#amount;
	}
	
	async nextState(): Promise<SearchState> {
		return produce(this.#lastState, (draft) => {
			draft.inventory = draft.inventory.slice();
			
			let rollsNeeded = this.getAttemptsRequired();
			let actualRolls = 0;
			let rollsPerNet = 10;
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
					this.#item.id,
					this.#amount,
					this.#lastState.playerInfo.maxInventory,
				);
			}else{
				// Partial drop
				increaseInventoryItem(
					draft.inventory,
					this.#item.id,
					Math.floor(actualRolls / this.#dropRate),
					this.#lastState.playerInfo.maxInventory,
				);
			}

			// Add by products
			for(let drop of this.#dropTable){
				if(drop.item.id === this.#item.id){
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
	#item: ItemInfo;
	#amount: number;
	#lastState: SearchState;

	constructor(item: ItemInfo, desiredAmount: number, state: SearchState) {
		this.#item = item;
		if(!this.#item.canCraft) {
			throw new Error(`Item ${item.name} is not craftable`);
		}
		this.#amount = Math.min(state.playerInfo.maxInventory, desiredAmount);
		this.#lastState = state;
	}

	toString(): string{
		return `Craft ${this.#item.name} x ${this.#amount}`;
	}

	getTimeRequired(): number {
		return 10000;
	}

	async nextState(): Promise<SearchState> {
		return produce(this.#lastState, (draft) => {
			draft.inventory = draft.inventory.slice();

			for(let item of this.#item.recipeItems){
				increaseInventoryItem(draft.inventory, item.item.id, -(this.#amount * item.quantity), this.#lastState.playerInfo.maxInventory);
			}

			increaseInventoryItem(draft.inventory, this.#item.id, this.#amount, this.#lastState.playerInfo.maxInventory);
		});
	}
}
