import { Component } from "preact";
import { getSearchState } from "../utils";
import { greedySearchState, NextState } from "../../algorithm/search";
import Result from "./Result.tsx";
import { debounce } from "es-toolkit";
import PlayerInfo from "./PlayerInfo";
import { actionsSearched } from "../../algorithm/search";
import { SearchState } from "../../algorithm/types.ts";
import ActionDisplay from "./ActionDisplay.tsx";
import CustomGoal from "./CustomGoal.tsx";

interface State {
	state: NextState[]|null,
	finish: boolean,
	error: string|null,
}

export default class MainApp extends Component<{}, State> {
	searchPromise: Promise<void>;
	#initialState: SearchState|null = null;
	
	state: State = {
		state: null,
		finish: false,
		error: null,
	}
	
	constructor() {
		super();
		this.searchPromise = this.search();
	}

	async search() {
		this.setState({finish: false});
		try {
			var searchState = await getSearchState();
			this.#initialState = searchState;
		}catch(_) {
			this.setState({error: "Game information not loaded - visit the inventory and quest pages", finish: true});
			return;
		}
		this.setState({
			state: [{
				actions: [],
				state: searchState,
				timeTaken: 0,
			}],
		});
		let questStages: NextState[] = [];
		let previousCompletedCount = 0;
		actionsSearched.actions = 0;
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
			this.setState({
				state: questStages,
			})
		});
		questStages[questStages.length-1] = lastState;
		this.setState({
			state: questStages,
			finish: true,
		});
	}

	componentDidMount(): void {
		chrome.storage.local.onChanged.addListener(this.onStorageChanged)
	}

	componentWillUnmount(): void {
		chrome.storage.local.onChanged.removeListener(this.onStorageChanged)
	}

	onStorageChanged = debounce((changes: { [key: string]: any }) => {
		// TODO: Abort signal
		if(!Object.keys(changes).some((key) => ["inventory", "quests", "ignoredQuests", "customGoals"].includes(key))) {
			return;
		}
		this.searchPromise = this.search();
	}, 1000);

	onAddIgnoredQuest = async (questName: string) => {
		let ignoreList = new Set((await chrome.storage.local.get("ignoredQuests")).ignoredQuests || []);
		ignoreList.add(questName);

		await chrome.storage.local.set({"ignoredQuests": Array.from(ignoreList)});

		this.searchPromise = this.search();
	}

	onRemoveIgnoreQuest = async (questName: string) => {
		let ignoreList = new Set((await chrome.storage.local.get("ignoredQuests")).ignoredQuests || []);
		ignoreList.delete(questName);

		await chrome.storage.local.set({"ignoredQuests": Array.from(ignoreList)});

		this.searchPromise = this.search();
	}

	onGetInitialState = () => {
		if (this.#initialState) {
			prompt("State", JSON.stringify(this.#initialState))
		}
	}

	onAddItemGoal = async (itemName: string, amount: number) => {
		let goals = (await chrome.storage.local.get("customGoals")).customGoals || {};
		if(!goals.items){
			goals.items = {};
		}
		goals.items[itemName] = amount;
		
		await chrome.storage.local.set({ customGoals: goals });
	}

	onRemoveItemGoal = async (itemName: string) => {
		let goals = (await chrome.storage.local.get("customGoals")).customGoals || {};
		if(!goals.items){
			return;
		}
		delete goals.items[itemName];
		
		await chrome.storage.local.set({ customGoals: goals });
	}

	render() {
		let hasResult = this.state.state && this.state.state.length > 0;
		return (
			<>
				<header class="bg-white p-2 border-b-1 border-b-slate-100 flex justify-between">
					<div class="font-bold">Farm RPG Guide</div>
					<div class="font-xs cursor-pointer" onClick={this.onGetInitialState} tabindex={1}>{actionsSearched.actions} actions searched</div>
				</header>
				{this.state.error && <div class="bg-red-200 m-2 rounded-md border-1 border-red-500 p-2">{this.state.error}</div>}
				{hasResult && <ActionDisplay actions={this.state.state![this.state.state!.length-1].actions} />}
				<Result state={this.state.state} finish={this.state.finish} onAddIgnoreQuest={this.onAddIgnoredQuest} onRemoveIgnoreQuest={this.onRemoveIgnoreQuest} onRemoveItemGoal={this.onRemoveItemGoal} />
				{hasResult && <CustomGoal onAddItemGoal={this.onAddItemGoal} />}
				{hasResult && <PlayerInfo state={this.state.state![this.state.state!.length-1].state} />}
			</>
		)
	}
}
