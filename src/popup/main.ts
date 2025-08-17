import {arrayToUint16, greedySearchState, NextState} from "../algorithm/search.ts";
import {SearchState} from "../algorithm/types.ts";
import {Quest, QuestType} from "../types.ts";
import {getQuestInfo} from "../data/buddyfarm.ts";
import {createElement, render} from "preact";
import QuestTable from "./components/QuestTable.tsx";

async function getSearchState(): Promise<SearchState> {
	let {quests, inventory, maxInventorySize, silver} = await chrome.storage.local.get(["quests", "inventory", "maxInventorySize", "silver"])

	return {
		inventory: arrayToUint16(inventory as number[]),
		silver,
		objectives: await Promise.all(
			(quests as Quest[])
				.filter(quest => [QuestType.Normal, QuestType.Special].includes(quest.type))
				.map(async (quest) => {
					let info = await getQuestInfo(quest.name);
					return {
						quest: info,
					}
				})),
		completedObjectives: [],

		playerInfo: {
			maxInventory: maxInventorySize,
			// TODO
			farmSize: 28,
			maxStamina: 30,
		},
	}
}

function refresh(state: NextState[]|null, finish: boolean = false){
	render(createElement(QuestTable, {
		state,
		finish,
	}), document.getElementById("app")!!);
}

async function main() {
	refresh(null);

	let searchState = await getSearchState();
	let questStages: NextState[] = [];
	let previousCompletedCount = 0;
	let lastState = await greedySearchState(searchState, (state) => {
		if (state.state.completedObjectives.length > previousCompletedCount) {
			// New completion detected - overwrite last entry, then push duplicate
			if (questStages.length === 0) {
				questStages.push(state);
			} else {
				questStages[questStages.length - 1] = state;
			}
			questStages.push(state); // Create duplicate for cutoff
			previousCompletedCount = state.state.completedObjectives.length;
		} else if (questStages.length === 0) {
			questStages.push(state);
		} else {
			questStages[questStages.length - 1] = state;
		}
		refresh(questStages);
	});
	questStages[questStages.length-1] = lastState;
	refresh(questStages, true);
}

main();
