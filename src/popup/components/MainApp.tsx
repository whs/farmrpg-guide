import { Component } from "preact";
import { getSearchState } from "../utils";
import { greedySearchState, NextState } from "../../algorithm/search";
import Result from "./Result.tsx";
import { debounce } from "es-toolkit";
import PlayerInfo from "./PlayerInfo";
import { actionsSearched } from "../../algorithm/search";
import ActionDisplay from "./ActionDisplay.tsx";

interface State {
	state: NextState[]|null,
	finish: boolean,
	error: string|null,
}

export default class MainApp extends Component<{}, State> {
	searchPromise: Promise<void>;
	
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
		if(!("inventory" in changes) && !("quests" in changes)) {
			return;
		}
		this.searchPromise = this.search();
	}, 1000)

	render() {
		return (
			<>
				<header class="bg-white p-2 border-b-1 border-b-slate-100 flex justify-between">
					<div class="font-bold">Farm RPG Guide</div>
					<div class="font-xs">{actionsSearched.actions} actions searched</div>
				</header>
				{this.state.error && <div class="bg-red-200 m-2 rounded-md border-1 border-red-500 p-2">{this.state.error}</div>}
				{this.state.state && this.state.state.length > 0 && <ActionDisplay actions={this.state.state[this.state.state.length-1].actions} />}
				<Result state={this.state.state} finish={this.state.finish} />
				{this.state.state && this.state.state.length > 0 && <PlayerInfo state={this.state.state[this.state.state.length-1].state} />}
			</>
		)
	}
}
