import { Component } from "preact";
import { getSearchState } from "../utils";
import { greedySearchState, NextState } from "../../algorithm/search";
import QuestTable from "./QuestTable";

interface State {
	state: NextState[]|null,
	finish: boolean,
}

export default class MainApp extends Component<{}, State> {
	searchPromise: Promise<void>;
	
	state: State = {
		state: null,
		finish: false,
	}
	
	constructor() {
		super();
		this.searchPromise = this.search();
	}

	async search() {
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
				<QuestTable state={this.state.state} finish={this.state.finish} />
			</>
		)
	}
}
