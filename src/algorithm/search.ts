import {APPLE_ID, FEED_ID, FLOUR_ID, GameplayError, MAX_ITEMS, Objective, Action, SearchState, STEAK_ID, STEAK_KABOB_ID, AmountTargetMode, FISHING_NET_ID, LARGE_FISHING_NET_ID, WORM_ID, GRUB_ID, MINNOW_ID, GUMMY_WORM_ID, MEALWORM_ID, BOARD_ID, STEEL_ID, STEEL_WIRE_ID, STRAW_ID, STONE_ID, COAL_ID, WOOD_ID, IRON_ID, NAILS_ID} from "./types.ts";
import {getItemInfo, getItemName, getLocationInfo, isExplorable, getFishingAreas, ItemInfo, QuestInfo} from "../data/buddyfarm.ts";
import {castDraft, createDraft, finishDraft, produce} from "immer";
import { delay, invariant } from "es-toolkit";
import {BuyItemStore, GiveToNPC, OpenChest, SellItem, SubmitQuest} from "./actions/ui.ts";
import {FarmPlant} from "./actions/farming.ts";
import {ExploreArea} from "./actions/exploring.ts";
import {ManualFishing, ManualFishingWithBait, NetFishing, NetFishingTimes} from "./actions/fishing.ts";
import {CraftItem} from "./actions/crafting.ts";
import {FeedMill, FlourMill, WaitFor, WaitForReset} from "./actions/passive.ts";
import {BuySteak, BuySteakKabob} from "./ui.ts";
import { diffItemMap } from "./utils.ts";

export const actionsSearched = {actions: 0};

// Do not sink items we can get hourly
const NO_SINK_ITEMS = [
	WOOD_ID,
	BOARD_ID,
	STEEL_ID,
	STEEL_WIRE_ID,
	STRAW_ID,
	STONE_ID,
	COAL_ID,
	IRON_ID,
	NAILS_ID,
	WORM_ID,
	GRUB_ID,
	MINNOW_ID,
	GUMMY_WORM_ID,
	MEALWORM_ID,
];

export function arrayToUint16(inventory: number[]){
	let out = new Uint16Array(MAX_ITEMS);
	for(let i = 0; i < inventory.length; i++){
		out[i] = inventory[i];
	}
	return out;
}

export interface NextState {
	readonly actions: readonly Action[],
	readonly state: SearchState,
	readonly timeTaken: number,
}

export function greedySearchState(state: SearchState, emit: (_: NextState) => void): Promise<NextState> {
	return _greedySearchState({
		actions: [],
		state: state,
		timeTaken: 0,
	}, emit)
}

async function _greedySearchState(state: NextState, emit: (_: NextState) => void): Promise<NextState> {
	let possibleFutures: NextState[] = (await Promise.all(state.state.objectives.map(async (objective) => {
		if(objective.ignored){
			return null;
		}
		// console.log(`Computing for objective ${objective.quest.name}`);
		let out = await tryToCompleteObjective(state, objective);
		// console.log(`Computing for objective ${objective.quest.name} DONE. It will take ${nextFuture.timeTaken}ms`);
		if(out.state === state.state) {
			return null;
		}
		return out;
	}))).filter((v) => v !== null);

	if (possibleFutures.length === 0) {
		return state;
	}

	let futureScore = async (future: NextState) => {
		// TODO: Take non-quest objective into goals as well
		const questCompletion = await getAverageObjectiveCompletion(future.state);
		const timeTaken = future.timeTaken - state.timeTaken;
		return Math.pow(questCompletion, 1.2) / Math.log(timeTaken + 1);
	};

	let bestFuture = possibleFutures[0];
	let bestFutureScore = await futureScore(bestFuture);
	for (let i = 1; i < possibleFutures.length; i++) {
		let currentScore = await futureScore(possibleFutures[i]);
		if (currentScore > bestFutureScore) {
			bestFuture = possibleFutures[i];
			bestFutureScore = currentScore;
		}
	}

	emit(bestFuture);

	await delay(10);

	return _greedySearchState(bestFuture, emit);
}

async function tryToCompleteObjective(state: NextState, objective: Objective, _internal: {avoidSink: boolean} = {avoidSink: true}): Promise<NextState> {
	// TODO: Probably better ideas
	let strategies: Action[] = [
		new WaitFor(state.state, 10),
		new WaitFor(state.state, 60),
	];

	if(!state.state.waitedForReset){
		strategies.push(new WaitForReset(state.state));
	}

	let completionScoreFunc: (state: NextState) => Promise<number> = () => {invariant(false, "set completionScoreFunc")};

	if(objective.quest) {
		completionScoreFunc = (state: NextState) => getQuestCompletionPercent(state.state.inventory, objective.quest!!);

		strategies.push(new SubmitQuest(objective.quest, state.state));
		strategies.push(...(await Promise.all(objective.quest.requiredItems.map(async (requiredItem) => {
			let itemInfo = await getItemInfo(requiredItem.item.name);
			return await howToGetItem(state, itemInfo, requiredItem.quantity);
		}))).flat());
	}else if(objective.item && objective.item.info){
		let itemId = objective.item.info.id;
		let itemsNeeded = Math.min(objective.item.amount, state.state.playerInfo.maxInventory) - state.state.inventory[itemId];

		if(itemsNeeded === 0){
			// Objective completed!
			return state;
		}else if(objective.item.mode === AmountTargetMode.EXACT && itemsNeeded < 0) {
			// We have too many items, sink
			strategies = []; // I don't want the WaitFor strategies
			let lastAverageRequestCompletion = await getAverageObjectiveCompletion(state.state);
			completionScoreFunc = (nextState: NextState) => getItemSinkScore(state, nextState, objective, lastAverageRequestCompletion);
			
			strategies.push(...(await howToSinkItem(state, objective.item.info, objective.item.amount)));
		}else if(itemsNeeded < 0) {
			// We have more than requested, objective completed!
			return state;
		}else{
			// Find more items
			completionScoreFunc = (state: NextState) => getItemCompletionPercent(state.state.inventory, objective.item!.info!, objective.item!.amount);
			
			strategies.push(...(await howToGetItem(state, objective.item.info, objective.item.amount)));
		}
	}

	let viableStrategies: NextState[] = (await Promise.all(strategies.map(async (strategy) => {
		try{
			var nextState = await strategy.nextState();
		}catch(e){
			if(!(e instanceof GameplayError)){
				throw e;
			}
			// console.error("Strategy failed", strategy.toString(), e);
			return null;
		}
		actionsSearched.actions++;
		return produce(state, (draft) => {
			// Add current action to the action list, but try merging if possible
			// TODO: Move merging to be done last, after voids
			(() => {
				// if (draft.actions.length > 0){
				// 	let lastItem  = draft.actions[draft.actions.length - 1];
				// 	if(lastItem.collapseWith){
				// 		let newItem = lastItem.collapseWith(strategy);
				// 		if(newItem !== null){
				// 			draft.actions[draft.actions.length - 1] = newItem
				// 			return;
				// 		}
				// 	}
				// }
				draft.actions.push(strategy);
			})();
			draft.state = castDraft(nextState);
			draft.timeTaken += strategy.getTimeRequired();
		});
	}))).filter(v => !!v) as NextState[];

	if (viableStrategies.length === 0) {
		return state;
	}

	let currentCompletionPercent = await completionScoreFunc(state);
	let bestStrategy: NextState|null = null;
	let bestCompletionScore = 0;

	for (let strategy of viableStrategies) {
		let objectiveStillExists = !objective.quest || strategy.state.objectives.some(obj => obj.quest?.name === objective.quest?.name);
		// If objective is eliminated, this is the best strategy
		if (!objectiveStillExists) {
			return strategy;
		}

		if(!_internal.avoidSink){
			// Don't allow any strategy that create voids if we are trying to avoid sink
			let voidItems = diffItemMap(state.state.inventoryVoid, strategy.state.inventoryVoid);
			if(voidItems.size > 0){
				continue;
			}
		}

		let completionPercent = await completionScoreFunc(strategy);
		if(objective.item?.mode === AmountTargetMode.EXACT){
			console.log("sinking", objective.item!.name, "Strategy", strategy.actions[strategy.actions.length-1].toString(), "completion percent", completionPercent);
		}

		// Score = (newCompletion - oldCompletion)/timeTaken (completion % per ms)
		let completionScore = (completionPercent - currentCompletionPercent) / (strategy.timeTaken - state.timeTaken);

		if(bestStrategy === null || completionScore > bestCompletionScore){
			bestStrategy = strategy;
			bestCompletionScore = completionScore;
		}
	}

	if(!bestStrategy){
		return state;
	}

	// If the best strategy doesn't move currentCompletionPercent, return input state
	if (await completionScoreFunc(bestStrategy) <= currentCompletionPercent) {
		console.log(objective.quest?.name, "best strategy doesn't move the goal", bestCompletionScore, currentCompletionPercent, bestStrategy.actions[bestStrategy.actions.length-1].toString())
		return state;
	}

	// Calculate void items and try to avoid it
	let voidItems = diffItemMap(state.state.inventoryVoid, bestStrategy.state.inventoryVoid);
	if(_internal.avoidSink && voidItems.size > 0){
		let currentState = state.state;
		
		let draft = createDraft(bestStrategy);
		let bestStrategyAction = draft.actions.pop()!;
		draft.timeTaken -= bestStrategyAction.getTimeRequired();
			
		for(let [itemId, voidAmount] of voidItems.entries()){
			if(NO_SINK_ITEMS.includes(itemId)){
				continue;
			}
			let itemName = await Promise.race([getItemName(itemId), delay(10)]);
			if(!itemName){
				continue;
			}
			let itemInfo = await getItemInfo(itemName);
			if(itemInfo.canBuy){
				// Skip all buyable items
				continue;
			}

			let sinkObjective = {
				item: {
					name: itemName,
					info: itemInfo,
					amount: Math.max(0, state.state.inventory[itemId] - voidAmount),
					mode: AmountTargetMode.EXACT,
				},
				ignored: false,
			};
			
			// Try to complete sink objective
			let sinkFuture = await tryToCompleteObjective({
				actions: [],
				state: currentState,
				timeTaken: 0,
			}, sinkObjective, {avoidSink: false});
			
			if(sinkFuture.state !== currentState) {
				currentState = sinkFuture.state;
				draft.actions.push(...sinkFuture.actions);
				draft.timeTaken += sinkFuture.timeTaken;
			}
		}

		let newBestStrategyAction = bestStrategyAction.withNewState(currentState);

		draft.actions.push(newBestStrategyAction);
		draft.state = castDraft(await newBestStrategyAction.nextState());
		draft.timeTaken += newBestStrategyAction.getTimeRequired();

		bestStrategy = finishDraft(draft);
	}

	// Don't search too hard
	await delay(1);

	return tryToCompleteObjective(bestStrategy, objective);
}

async function howToGetItem(state: NextState, item: ItemInfo, amount: number): Promise<Action[]>{
	let out: Action[] = [];
	let itemsNeeded = amount - state.state.inventory[item.id];

	if(itemsNeeded <= 0) {
		return out;
	}

	if (item.id === STEAK_ID) {
		out.push(new BuySteak(itemsNeeded, state.state));
	} else if (item.id === STEAK_KABOB_ID) {
		out.push(new BuySteakKabob(itemsNeeded, state.state));
	}
	if(item.canBuy) {
		out.push(new BuyItemStore(item, itemsNeeded, state.state));
	}

	// Below this point are recursive checks, so we quickly return if we have fast methods
	if(out.length > 0){
		return out;
	}

	if(item.id === FLOUR_ID) {
		out.push(new FlourMill(itemsNeeded, state.state));
		out.push(...await howToGetItem(state, await getItemInfo("Wheat"), Math.ceil(itemsNeeded/14.4)));
	} else if (item.id === FEED_ID) {
		let allFeedInfo = await Promise.all(Object.keys(FeedMill.feedTable).map((itemName) => getItemInfo(itemName)));
		for(let feed of allFeedInfo) {
			out.push(new FeedMill(feed, itemsNeeded, state.state));
			out.push(...await howToGetItem(state, feed, Math.ceil(itemsNeeded/FeedMill.feedTable[feed.name])));
		}
	}

	if(item.canCraft) {
		out.push(new CraftItem(item, itemsNeeded, state.state));
		out.push(...(await Promise.all(item.recipeItems.map(async (recipeItem) => {
			let itemInfo = await getItemInfo(recipeItem.item.name);
			return await howToGetItem(state, itemInfo, recipeItem.quantity * itemsNeeded)
		}))).flat());
	}

	for (let method of item.dropRatesItems) {
		if (method.dropRates.seed) {
			// FIXME: Check requirements - Buddyfarm doesn't record these
			let seedInfo = await getItemInfo(method.dropRates.seed.name);
			let farmPlant = new FarmPlant(seedInfo, item, itemsNeeded, state.state);
			out.push(...await howToGetItem(state, seedInfo, farmPlant.getSeedNeeded()));
			out.push(farmPlant);
		}
		if(method.dropRates.location?.type === "explore") {
			if(["Santa's Workshop", "Haunted House"].includes(method.dropRates.location.name)) {
				// Ignore
			} else {
				let locationInfo = await getLocationInfo(method.dropRates.location.name);
				out.push(new ExploreArea(locationInfo, item, itemsNeeded, state.state));
			}
		}
		if(method.dropRates.location?.type === "fishing") {
			let locationInfo = await getLocationInfo(method.dropRates.location.name);
			try{
				out.push(new NetFishing(locationInfo, item, itemsNeeded, state.state));
			}catch(e){
				// Ignore error if it's hand fishing only
			}
			out.push(new ManualFishing(locationInfo, item, itemsNeeded, state.state));
		}
	}

	// Don't open chest to find chest
	if(item.locksmithItems.length === 0 && item.locksmithOutputItems.length > 0){
		out.push(...(await Promise.all(item.locksmithOutputItems.map(async (chest) => {
			let averageRoll = (chest.quantityMin!! + chest.quantityMax!!) / 2;
			let chestsNeeded = Math.ceil(itemsNeeded/averageRoll);
			
			let chestInfo = await getItemInfo(chest.item.name);
			
			// Open chest one by one in case we already have them. It is generally hard to acquire all the chests
			out.push(new OpenChest(chestInfo, 1, state.state));
			return await howToGetItem(state, chestInfo, chestsNeeded);
		}))).flat());
	}

	return out;
}

async function howToSinkItem(state: NextState, item: ItemInfo, amount: number): Promise<Action[]> {
	let sinkAmount = state.state.inventory[item.id] - amount;
	if(sinkAmount <= 0){
		return [];
	}
	
	let out: Action[] = [
		new SellItem(item, sinkAmount, state.state, 10_000),
	];

	// TODO: Explore

	if([FISHING_NET_ID, LARGE_FISHING_NET_ID].includes(item.id)) {
		let fishingLocations = await getFishingAreas();
		
		let netActions = await Promise.all(fishingLocations.map(async (locationName) => {
			let locationInfo = await getLocationInfo(locationName);
			return new NetFishingTimes(locationInfo, item.id, sinkAmount, state.state);
		}));
		
		out.push(...netActions);
	}
	
	if([WORM_ID, GRUB_ID, MINNOW_ID, GUMMY_WORM_ID, MEALWORM_ID].includes(item.id)) {
		let fishingLocations = await getFishingAreas();
		
		let baitActions = await Promise.all(fishingLocations.map(async (locationName) => {
			let locationInfo = await getLocationInfo(locationName);
			return new ManualFishingWithBait(locationInfo, item, sinkAmount, state.state);
		}));
		
		out.push(...baitActions);
	}

	out.push(...(await Promise.all(item.recipeIngredientItems.map(async (recipe) => {
		let recipeItem = await getItemInfo(recipe.item.name);
		if(recipe.item.canCraft){
			let maxCraftable = sinkAmount;

			for(let ingredient of recipeItem.recipeItems){
				let craftable = Math.floor(state.state.inventory[ingredient.item.id] / ingredient.quantity);
				maxCraftable = Math.min(maxCraftable, craftable);
			}
			
			if(maxCraftable > 0){
				return new CraftItem(recipeItem, maxCraftable, state.state);
			}
		}
	}))).filter(v => v !== undefined));

	if(item.canMail){
		for(let npc of item.npcItems){
			out.push(new GiveToNPC(item, npc.npc.name, sinkAmount, state.state));
		}
	}

	return out;
}

async function getQuestCompletionPercent(inventory: Uint16Array, quest: QuestInfo): Promise<number> {
	let completions = await Promise.all(quest.requiredItems.map(async (item) => {
		let itemInfo = await getItemInfo(item.item.name);
		return await getItemCompletionPercent(inventory, itemInfo, item.quantity);
	}));
	
	if (completions.length === 0) {
		return 1.0;
	}
	
	return completions.reduce((a, b) => a + b, 0) / completions.length;
}

let _getItemCompletionPercentCache = new WeakMap<Uint16Array, Map<string, number>>();
async function getItemCompletionPercent(inventory: Uint16Array, item: ItemInfo, amount: number): Promise<number> {
	// Seems that from my test, cache hit rate is only 0.9%
	let cache = _getItemCompletionPercentCache.get(inventory);
	let cacheKey = `${item.id}_${amount}`;
	if (cache) {
		let out = cache.get(cacheKey);
		if (out !== undefined) {
			return out;
		}
	}

	let out = await _getItemCompletionPercent(inventory, item, amount);
	cache = _getItemCompletionPercentCache.get(inventory) || new Map();
	cache.set(cacheKey, out);
	_getItemCompletionPercentCache.set(inventory, cache);

	return out;
}

async function _getItemCompletionPercent(inventory: Uint16Array, item: ItemInfo, amount: number): Promise<number> {
	invariant(!isNaN(amount), `NaN is not supported (asking for item ${item.name})`)
	if(amount <= 0 || inventory[item.id] >= amount) {
		// We have enough items
		return 1;
	}

	let baseCompletion = inventory[item.id] / amount;
	let itemsLeft = Math.max(0, amount - inventory[item.id]);
	
	// Check seed completion
	let farmingCompletion = 0;
	for(let dropRate of item.dropRatesItems){
		if(dropRate.dropRates.seed !== null){
			let seedInfo = await getItemInfo(dropRate.dropRates.seed!!.name);
			let seedsNeeded = Math.ceil(itemsLeft * dropRate.rate);
			let seedAvailability = await getItemCompletionPercent(inventory, seedInfo, seedsNeeded);
			// If we have grape juice, then count completed seed as 90% complete
			// otherwise, count seed as 50% of a real item
			let grapeJuicesNeeded = await getItemCompletionPercent(inventory, await getItemInfo("Grape Juice"), Math.ceil(seedAvailability / 20)); // XXX: Placeholder farm size
			farmingCompletion = (seedAvailability * grapeJuicesNeeded * 0.9) + (seedAvailability * (1-grapeJuicesNeeded) * 0.5);
			break;
		}
	}

	// If we have the chest, reduce items needed
	let chestSaved = 0;
	for (let chest of item.locksmithOutputItems) {
		let averageRoll = (chest.quantityMin!! + chest.quantityMax!!) / 2;
		// TODO: Grab bag handling
		// Items in chest count as 80% of real item
		let rollsSaved = (Math.min(averageRoll * inventory[chest.item.id], itemsLeft) / itemsLeft) * 0.8;
		// TODO: Key - this function is not async so we don't have chest key info

		chestSaved = Math.max(chestSaved, rollsSaved);
	}


	let exploreCompletion = 0;
	// Recipe items that are found in exploration are banned to prevent infinite recursion
	const NO_RECURSION_ITEMS = [
		"Arnold Palmer", "Lemonade", "Apple Cider", "Orange Juice", "Apple",
		"Iced Tea", "Glass Bottle", "Tea Leaves", "Lemon", "Orange", "Glass Orb", "Stone",
		"Shimmer Stone", "Unpolished Shimmer Stone", "Emberstone", "Sandstone", "Sand", "Leather", "Hide",
	];
	if (isExplorable(item)) {
		let expectedExploreCount = item.dropRatesItems.filter((dropRate) => {
			// TODO: Handle locked locations
			return dropRate.dropRates.location?.type === "explore";
		}).reduce((a, b) => a.rate < b.rate ? a : b).rate * itemsLeft;
		let startingExploreCount = expectedExploreCount;

		// Get item completion, but use fallback non-recursive algorithm if the current item
		// do not allow for recursion
		let getItemCompletionIfNotBanned = async (name: string, amount: number) => {
			if (amount <= 0) {
				return 1;
			}
			let itemInfo = await getItemInfo(name);
			if (NO_RECURSION_ITEMS.includes(item.name)) { // XXX: This is the upper function input
				return Math.min(1, inventory[itemInfo.id] / amount);
			}
			return await getItemCompletionPercent(inventory, itemInfo, amount);
		};
		
		let hasAp = await getItemCompletionIfNotBanned("Arnold Palmer", Math.floor(expectedExploreCount/200));
		expectedExploreCount -= hasAp * 200;

		let hasLemonade = await getItemCompletionIfNotBanned("Lemonade", Math.floor(expectedExploreCount/10));
		expectedExploreCount -= hasLemonade * 10;

		let hasAppleCider = await getItemCompletionIfNotBanned("Apple Cider", Math.floor(expectedExploreCount/1010));
		let hasOJ = await getItemCompletionIfNotBanned("Orange Juice", Math.floor(expectedExploreCount/100));
		// Apple is an end product so we never need need to recurse
		let hasApple = Math.min(0, inventory[APPLE_ID] / Math.floor(expectedExploreCount/10));
		if(isNaN(hasApple)){
			// hasApple can be division by zero if expectedExploreCount < 10
			hasApple = 0;
		}
		
		let usableAppleCider = (hasAppleCider*1010) / ((hasOJ * 100) + (hasApple * 10));
		expectedExploreCount -= usableAppleCider * 1010;
		expectedExploreCount = Math.max(0, expectedExploreCount);

		// exploreCompletion is percentage of completed explore with all the juices
		// it only counts as 50% of real completion
		exploreCompletion = (1-(expectedExploreCount / startingExploreCount)) * 0.5
	}

	// Check recipe completion
	let recipeCompletion = 0;
	if(item.recipeItems.length > 0) {
		let recipeCompletions = item.recipeItems.map(async (recipe) => {
			let expectedQuantity = recipe.quantity * itemsLeft;
			let componentInfo = await getItemInfo(recipe.item.name);
			return getItemCompletionPercent(inventory, componentInfo, expectedQuantity);
		});
		// Count uncrafted items as 50% of real item
		recipeCompletion = (await Promise.all(recipeCompletions)).reduce((a, b) => a * b, 1.0) * 0.5;
	}

	// Use the best completion method for remaining items
	let remainingCompletion = Math.max(farmingCompletion, exploreCompletion, recipeCompletion, chestSaved);
	
	return baseCompletion + (itemsLeft / amount) * remainingCompletion;
}

async function getAverageObjectiveCompletion(state: SearchState): Promise<number> {
	let totalQuest = state.completedObjectives.length;
	let completion = state.completedObjectives.length;
	for(let objective of state.objectives) {
		totalQuest += 1;
		if(objective.quest) {
			completion += await getQuestCompletionPercent(state.inventory, objective.quest);
		} else if (objective.item && objective.item.info) {
			completion += await getItemCompletionPercent(state.inventory, objective.item.info, objective.item.amount);
		} else {
			totalQuest -= 1;
		}
	}

	return completion / totalQuest;
}

async function getItemSinkScore(lastState: NextState, state: NextState, _objective: Objective, lastAverageRequestCompletion: number): Promise<number>{
	if (lastState === state) {
		return 0;
	}

	let newAverageObjectiveCompletion = await getAverageObjectiveCompletion(state.state);
	
	let silverGained = state.state.silver - lastState.state.silver;
	let questCompletionChanged = newAverageObjectiveCompletion - lastAverageRequestCompletion;

	// Manual rules
	let manualWeight = 0;
	if (questCompletionChanged > 0 && state.actions[state.actions.length - 1] instanceof CraftItem) {
		manualWeight = 1000;
	}
	
	let netQuestImpact = questCompletionChanged > 0 ? questCompletionChanged * 200 : questCompletionChanged * 2;
	let silverUtility = silverGained > 0 ?  (Math.log(silverGained + 1) * 0.05) : 0;

	return manualWeight + netQuestImpact + silverUtility;
}
