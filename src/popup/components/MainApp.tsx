import { Component } from "preact";
import { getSearchState } from "../utils";
import { greedySearchState, NextState } from "../../algorithm/search";
import QuestTable from "./QuestTable";

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
		try {
			var searchState = await getSearchState();
		}catch(_) {
			this.setState({error: "Game information not loaded - visit the inventory and quest pages"});
			return;
		}
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

	render() {
		return (
			<>
				<header class="bg-white p-2 border-b-1 border-b-slate-100">
					<div class="font-bold">Farm RPG Guide</div>
				</header>
				{this.state.error ? <div class="bg-red-200 m-2 rounded-md border-1 border-red-500 p-2">{this.state.error}</div>}
				<QuestTable state={this.state.state} finish={this.state.finish} />
			</>
		)
	}
}
