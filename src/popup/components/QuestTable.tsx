import {Component} from "preact";
import {NextState} from "../../algorithm/search.ts";
import {Objective} from "../../algorithm/types.ts";
import { formatDuration } from "../utils.ts";

interface Props {
	state: NextState[]|null,
	finish: boolean
}

export default class QuestTable extends Component<Props, any> {
	render() {
		if(!this.props.state){
			return (
				<div class="bg-white m-3 rounded-md border-1 border-slate-200 p-2">
					Computing...
				</div>
			);
		}

		let lastActionLength = 0;
		let lastState = this.props.state[this.props.state.length-1];
		let lastTimeTaken = 0;
		let lastCompletedQuestName: string|undefined = undefined;
		return (
			<div>
				{this.props.state.map((state, index) => {
					let newActions=  state.actions.slice(lastActionLength);
					if(newActions.length === 0){
						return null;
					}
					let timeTaken = state.timeTaken - lastTimeTaken;
					lastActionLength = state.actions.length;
					lastTimeTaken = state.timeTaken;
					let lastCompletedQuest: Objective|undefined = state.state.completedObjectives[state.state.completedObjectives.length - 1];
					let questName = lastCompletedQuest?.quest?.name;
					if(questName === lastCompletedQuestName){
						questName = undefined;
					}
					lastCompletedQuestName = questName;
					return (
						<div class="bg-white m-3 rounded-md border-1 border-slate-200 p-2">
							<div class="flex flex-row items-center font-bold mb-2">
								<div class="bg-slate-300 p-1 rounded-md mr-2 px-2">{index + 1}</div>
								<div class="grow text-base">{questName}</div>
								<div class="text-xs font-medium border-1 border-slate-200 p-1 rounded-md bg-slate-100">{formatDuration(timeTaken)}</div>
							</div>
							<ol class="list-decimal pl-6 leading-6">
								{newActions.map((i) => (<li>{i.toString()}</li>))}
							</ol>
						</div>
					);
				})}
				{lastState.state.objectives.length > 0 ? (
					<div class="bg-red-200 m-2 rounded-md border-1 border-red-500 p-2">
						<strong class="text-red-700 text-base mb-2">Quest remaining</strong>
						<ol class="list-decimal pl-6 leading-6">
							{lastState.state.objectives.map((i) => <li>{i.quest?.name}</li>)}
						</ol>
					</div>
				) : null}
			</div>
		)
	}
}
