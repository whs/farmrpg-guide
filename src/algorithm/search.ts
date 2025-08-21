import {APPLE_ID, FEED_ID, FLOUR_ID, GameplayError, MAX_ITEMS, Objective, Provider, SearchState, STEAK_ID, STEAK_KABOB_ID} from "./types.ts";
import {getItemInfo, getLocationInfo, isExplorable, ItemInfo, QuestInfo} from "../data/buddyfarm.ts";
import {BuyItemStore, BuySteak, BuySteakKabob, CraftItem, ExploreArea, FarmPlant, FeedMill, FlourMill, ManualFishing, NetFishing, SubmitQuest, WaitFor10Min, WaitForHourly, WaitForReset} from "./provider.ts";
import {castDraft, produce} from "immer";

export const actionsSearched = {actions: 0};

export function arrayToUint16(inventory: number[]){
	let out = new Uint16Array(MAX_ITEMS);
	for(let i = 0; i < inventory.length; i++){
		out[i] = inventory[i];
	}
	return out;
}

export interface NextState {
	readonly actions: readonly Provider[],
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

export function sleep(time: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, time);
	})
}

async function _greedySearchState(state: NextState, emit: (_: NextState) => void): Promise<NextState> {
	let possibleFutures: NextState[] = (await Promise.all(state.state.objectives.map(async (objective) => {
		if(!objective.quest){
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
		const questCompletion = await getAverageQuestCompletion(future.state);
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
	await sleep(10);

	return _greedySearchState(bestFuture, emit);
}

async function tryToCompleteObjective(state: NextState, objective: Objective): Promise<NextState> {
	// TODO: Probably better ideas
	let strategies: Provider[] = [
		new SubmitQuest(objective.quest!!, state.state),
		new WaitForReset(state.state),
		new WaitForHourly(state.state),
		new WaitFor10Min(state.state),
	];
	strategies.push(...(await Promise.all(objective.quest!!.requiredItems.map(async (requiredItem) => {
		let itemInfo = await getItemInfo(requiredItem.item.name);
		return await tryToGetItem(state, itemInfo, requiredItem.quantity);
	}))).flat());

	let currentCompletionPercent = await getQuestCompletionPercent(state.state.inventory, objective.quest!!);

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
			draft.actions.push(strategy);
			draft.state = castDraft(nextState);
			draft.timeTaken += strategy.getTimeRequired();
		});
	}))).filter(v => !!v) as NextState[];

	if (viableStrategies.length === 0) {
		return state;
	}

	let bestStrategy = viableStrategies[0];
	// Score = (newCompletion - oldCompletion)/timeTaken (completion % per ms)
	let bestCompletionScore = 0;

	for (let strategy of viableStrategies) {
		let objectiveStillExists = strategy.state.objectives.some(obj => obj.quest?.name === objective.quest?.name);
		// If objective is eliminated, this is the best strategy
		if (!objectiveStillExists) {
			return strategy;
		}

		let completionPercent = await getQuestCompletionPercent(strategy.state.inventory, objective.quest!!);
		// console.log("Strategy", strategy.actions[strategy.actions.length-1].toString(), "completion percent", completionPercent);
		let completionScore = (completionPercent - currentCompletionPercent) / (strategy.timeTaken - state.timeTaken);
		if(bestStrategy === null || completionScore > bestCompletionScore){
			bestStrategy = strategy;
			bestCompletionScore = completionScore;
		}
	}

	// If the best strategy doesn't move currentCompletionPercent, return input state
	if (await getQuestCompletionPercent(bestStrategy.state.inventory, objective.quest!!) <= currentCompletionPercent) {
		console.log(objective.quest?.name, "best strategy doesn't move the goal", bestCompletionScore, currentCompletionPercent, bestStrategy.actions[bestStrategy.actions.length-1].toString())
		return state;
	}

	// Don't search too hard
	await sleep(1);

	return tryToCompleteObjective(bestStrategy!!, objective);
}

async function tryToGetItem(state: NextState, item: ItemInfo, amount: number): Promise<Provider[]>{
	let out: Provider[] = [];
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
		out.push(...await tryToGetItem(state, await getItemInfo("Wheat"), Math.ceil(itemsNeeded/14.4)));
	} else if (item.id === FEED_ID) {
		let allFeedInfo = await Promise.all(Object.keys(FeedMill.feedTable).map((itemName) => getItemInfo(itemName)));
		for(let feed of allFeedInfo) {
			out.push(new FeedMill(feed, itemsNeeded, state.state));
			out.push(...await tryToGetItem(state, feed, Math.ceil(itemsNeeded/FeedMill.feedTable[feed.name])));
		}
	}

	if(item.canCraft) {
		out.push(new CraftItem(item, itemsNeeded, state.state));
		out.push(...(await Promise.all(item.recipeItems.map(async (recipeItem) => {
			let itemInfo = await getItemInfo(recipeItem.item.name);
			return await tryToGetItem(state, itemInfo, recipeItem.quantity * itemsNeeded)
		}))).flat());
	}

	for (let method of item.dropRatesItems) {
		if (method.dropRates.seed) {
			// FIXME: Check requirements - Buddyfarm doesn't record these
			let seedInfo = await getItemInfo(method.dropRates.seed.name);
			let farmPlant = new FarmPlant(seedInfo, item, itemsNeeded, state.state);
			out.push(...await tryToGetItem(state, seedInfo, farmPlant.getSeedNeeded()));
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
			out.push(new NetFishing(locationInfo, item, itemsNeeded, state.state));
			out.push(new ManualFishing(locationInfo, item, itemsNeeded, state.state));
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
	if(isNaN(amount)){
		throw new Error(`NaN is not supported (asking for item ${item.name})`)
	}
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
		let hasApple = Math.min(1, inventory[APPLE_ID] /  Math.floor(expectedExploreCount/10)); 
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
	let remainingCompletion = Math.max(farmingCompletion, exploreCompletion, recipeCompletion);
	
	return baseCompletion + (itemsLeft / amount) * remainingCompletion;
}

async function getAverageQuestCompletion(state: SearchState): Promise<number> {
	let totalQuest = state.completedObjectives.length;
	let completion = state.completedObjectives.length;
	for(let quest of state.objectives) {
		totalQuest += 1;
		if(quest.quest) {
			completion += await getQuestCompletionPercent(state.inventory, quest.quest);
		}
	}

	return completion / totalQuest;
}
