import {Component} from "preact";
import {NextState} from "../../algorithm/search.ts";
import {Objective, Action} from "../../algorithm/types.ts";
import { formatDuration } from "../utils.ts";
import Loader from "./Loader.tsx";
import { ActionRenderer } from "./actions.tsx";
import Item from "./Item.tsx";

interface Props {
	state: NextState[]|null,
	finish: boolean
	onAddIgnoreQuest: (name: string) => void,
	onRemoveIgnoreQuest: (name: string) => void,
	onRemoveItemGoal: (name: string) => void,
}

export default class Result extends Component<Props, any> {
	render() {
		if(!this.props.state){
			return (
				<div class="flex justify-center items-center" style={{height: "100px"}}><Loader /></div>
			);
		}

		let lastActionLength = 0;
		let lastState = this.props.state[this.props.state.length-1];
		let lastTimeTaken = 0;
		let lastCompletedQuestName: string|undefined = undefined;
		return (
			<div>
				{this.props.state.map((state, index) => {
					let newActions = state.actions.slice(lastActionLength);
					if(newActions.length === 0){
						return null;
					}
					let timeTaken = state.timeTaken - lastTimeTaken;
					lastActionLength = state.actions.length;
					lastTimeTaken = state.timeTaken;
					let lastCompletedQuest: Objective|undefined = state.state.completedObjectives[state.state.completedObjectives.length - 1];
					let questName = lastCompletedQuest?.quest?.name;
					let questIcon: string|null = lastCompletedQuest?.quest?.image ? new URL(lastCompletedQuest?.quest?.image, "https://farmrpg.com").toString() : null;
					if(questName === lastCompletedQuestName){
						questName = undefined;
						questIcon = null;
					}
					lastCompletedQuestName = questName;

					return (
						<div class="bg-white m-3 rounded-md border-1 border-slate-200 p-2 group" key={index}>
							<div class="flex flex-row items-center font-bold mb-2">
								<div class="bg-slate-300 flex items-center justify-center rounded-md mr-2 px-2 bg-cover bg-left ng-no-repeat text-white text-shadow-md/80 shadow-lg/30 w-8 h-8 text-lg font-black text-center" style={questIcon ? {backgroundImage: `url(${questIcon})`} : {}}>{index + 1}</div>
								<div class="grow text-base">{questName}</div>
								<div class="text-xs font-medium border-1 border-slate-200 p-1 rounded-md bg-slate-100">{formatDuration(timeTaken)}</div>
								{questName && <button title="Ignore" class="ml-1 text-xs border-1 border-red-800 p-1 rounded-md hover:bg-red-100 cursor-pointer" onClick={() => this.props.onAddIgnoreQuest(questName)}><span class="material-symbols-rounded text-xs!">visibility_off</span></button>}
							</div>
							<ol class="list-decimal pl-6 leading-6">
								{this.formatActions(newActions)}
							</ol>
						</div>
					);
				})}
				{this.props.finish ? null : <div class="flex justify-center items-center" style={{height: "100px"}}><Loader /></div>}
				{lastState.state.objectives.length > 0 ? (
					<div class="bg-red-200 m-2 rounded-md border-1 border-red-500 p-2">
						<strong class="text-red-700 text-base mb-2">Objectives remaining ({lastState.state.objectives.length})</strong>
						<ol class="list-decimal pl-6 leading-6">
							{lastState.state.objectives.map((objective) => this.renderRemainingObjective(objective))}
						</ol>
					</div>
				) : null}
			</div>
		)
	}

	renderRemainingObjective(objective: Objective) {
		if(objective.quest) {
			return (
				<li key={`quest ${objective.quest.name}`}>
					<div class="flex justify-between">
						<div>{objective.quest.name}</div>
						{objective.ignored ? (
							<button title="Unignore" class="p-1 rounded-md text-slate-700 text-xs cursor-pointer hover:bg-red-100" onClick={() => this.props.onRemoveIgnoreQuest(objective.quest!.name)}><span class="material-symbols-rounded text-xs!">visibility</span></button>
						) : (
							<button title="Ignore" class="p-1 rounded-md text-red-700 text-xs cursor-pointer hover:bg-red-100" onClick={() => this.props.onAddIgnoreQuest(objective.quest!.name)}><span class="material-symbols-rounded text-xs!">visibility_off</span></button>
						)}
					</div>
				</li>
			);
		} else if(objective.item) {
			return (
				<li key={`item ${objective.item.name}`}>
					<div class="flex justify-between">
						<div>{objective.item.info ? <Item item={objective.item.info} /> : objective.item.name} ×{objective.item.amount}</div>
						<button title="Remove" class="p-1 rounded-md text-red-700 text-xs cursor-pointer hover:bg-red-100" onClick={() => this.props.onRemoveItemGoal(objective.item!.name)}><span class="material-symbols-rounded text-xs!">remove</span></button>
					</div>
				</li>
			);
		}else{
			return <li>Unknown objective type</li>;
		}
	}

	formatActions(actions: Action[]) {
		return actions.map((action) => {
			return <li key={action.toString()}><ActionRenderer action={action} /></li>;
		})
	}
}
