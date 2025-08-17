import {GameplayError, MAX_ITEMS, Objective, Provider, SearchState} from "./types.ts";
import {getItemInfo, getLocationInfo, ItemInfo, QuestInfo} from "../data/buddyfarm.ts";
import {BuyItemStore, CraftItem, ExploreArea, FarmPlant, ManualFishing, NetFishing, SubmitQuest} from "./provider.ts";
import {castDraft, produce} from "immer";

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
	let possibleFutures: NextState[] = [];
	for(let objective of state.state.objectives) {
		if(!objective.quest){
			continue;
		}
		// console.log(`Computing for objective ${objective.quest.name}`);
		let nextFuture = await tryToCompleteObjective(state, objective);
		// console.log(`Computing for objective ${objective.quest.name} DONE. It will take ${nextFuture.timeTaken}ms`);
		if(nextFuture.state !== state.state) {
			possibleFutures.push(nextFuture);
		}
		// Don't search too hard
		await sleep(1);
	}

	if (possibleFutures.length === 0) {
		return state;
	}

	// Find item with minimum timeTaken
	let bestFuture = possibleFutures[0];
	for (let i = 1; i < possibleFutures.length; i++) {
		if (possibleFutures[i].state.completedObjectives.length >= bestFuture.state.completedObjectives.length && possibleFutures[i].timeTaken < bestFuture.timeTaken) {
			bestFuture = possibleFutures[i];
		}
	}

	emit(bestFuture);
	await sleep(100);

	return _greedySearchState(bestFuture, emit);
}

async function tryToCompleteObjective(state: NextState, objective: Objective): Promise<NextState> {
	// TODO: Probably better ideas
	let strategies: Provider[] = [
		new SubmitQuest(objective.quest!!, state.state),
	];
	for(let requiredItem of objective.quest!!.requiredItems) {
		let itemInfo = await getItemInfo(requiredItem.item.name);
		let itemsNeeded = requiredItem.quantity - state.state.inventory[itemInfo.id];

		if(itemsNeeded <= 0) {
			continue;
		}

		if(itemInfo.canBuy) {
			strategies.push(new BuyItemStore(itemInfo, itemsNeeded, state.state));
		}
		if(itemInfo.canCraft) {
			// TODO: Recursively search for items needed to craft
			// TODO: Check requirements
			strategies.push(new CraftItem(itemInfo, itemsNeeded, state.state));
		}

		for (let method of itemInfo.dropRatesItems) {
			if (method.dropRates.seed) {
				// TODO: Check requirements
				let seedInfo = await getItemInfo(method.dropRates.seed.name);
				let farmPlant = new FarmPlant(seedInfo, itemInfo, itemsNeeded, state.state);
				let seedNeeded = farmPlant.getSeedNeeded() - state.state.inventory[seedInfo.id];
				if(seedInfo.canBuy && seedNeeded > 0){
					// TODO: I think this doesn't get calculated as quest progression
					strategies.push(new BuyItemStore(seedInfo, seedNeeded, state.state));
				}
				strategies.push(farmPlant);
			}
			if(method.dropRates.location?.type === "explore") {
				// TODO: Check requirements
				let locationInfo = await getLocationInfo(method.dropRates.location.name);
				strategies.push(new ExploreArea(locationInfo, itemInfo, itemsNeeded, state.state));
			}
			if(method.dropRates.location?.type === "fishing") {
				// TODO: Check requirements
				let locationInfo = await getLocationInfo(method.dropRates.location.name);
				strategies.push(new NetFishing(locationInfo, itemInfo, itemsNeeded, state.state));
				strategies.push(new ManualFishing(locationInfo, itemInfo, itemsNeeded, state.state));
			}
		}
	}

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
	let bestCompletionPercent = currentCompletionPercent;

	for (let strategy of viableStrategies) {
		let objectiveStillExists = strategy.state.objectives.some(obj => obj.quest?.name === objective.quest?.name);
		// If objective is eliminated, this is the best strategy
		if (!objectiveStillExists) {
			return strategy;
		}

		let completionPercent = await getQuestCompletionPercent(strategy.state.inventory, objective.quest!!);
		// console.log("Strategy", strategy.actions[strategy.actions.length-1].toString(), "completion percent", completionPercent);
		if(bestStrategy === null || completionPercent > bestCompletionPercent){
			bestStrategy = strategy;
			bestCompletionPercent = completionPercent;
		}
	}

	// If the best strategy doesn't move currentCompletionPercent, return input state
	if (bestCompletionPercent <= currentCompletionPercent) {
		console.log(objective.quest?.name, "best strategy doesn't move the goal", bestCompletionPercent, currentCompletionPercent, bestStrategy.actions[bestStrategy.actions.length-1].toString())
		return state;
	}

	// Don't search too hard
	await sleep(1);

	return tryToCompleteObjective(bestStrategy!!, objective);
}

async function getQuestCompletionPercent(inventory: Uint16Array, quest: QuestInfo): Promise<number> {
	let completions = [];

	for (let item of quest.requiredItems) {
		let itemInfo = await getItemInfo(item.item.name);
		completions.push(await getItemCompletionPercent(inventory, itemInfo, item.quantity));
	}
	
	if (completions.length === 0) {
		return 1.0;
	}
	
	return completions.reduce((a, b) => a + b, 0) / completions.length;
}

async function getItemCompletionPercent(inventory: Uint16Array, item: ItemInfo, amount: number): Promise<number> {
	if(isNaN(amount)){
		throw new Error("NaN is not supported")
	}
	console.log("We need item", item.id, amount);
	if(amount <= 0 || inventory[item.id] >= amount) {
		// We have enough items
		return 1;
	}

	let out = inventory[item.id]/amount
	let itemsLeft = Math.max(0, amount - inventory[item.id]);

	for(let dropRate of item.dropRatesItems){
		if(dropRate.dropRates.seed !== null){
			let seedInfo = await getItemInfo(dropRate.dropRates.seed!!.name);
			// Count seed as 1% of a real item
			out += await getItemCompletionPercent(inventory, seedInfo, Math.ceil(itemsLeft * dropRate.rate)) * 0.01;
			break;
		}
	}
	for(let recipe of item.recipeItems){
		let expectedQuantity = recipe.quantity * itemsLeft;
		out += (itemsLeft / item.recipeItems.length) * Math.min(expectedQuantity, inventory[recipe.item.id]) / expectedQuantity;
	}

	return out;
}