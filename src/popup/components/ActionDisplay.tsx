import { Component, Fragment } from "preact";
import { Action } from "../../algorithm/types";
import { ActionRenderer } from "./provider";
import {FarmPlant} from "../../algorithm/actions/farming.ts";
import {ExploreArea} from "../../algorithm/actions/exploring.ts";
import {ManualFishing, NetFishing} from "../../algorithm/actions/fishing.ts";
import {CraftItem} from "../../algorithm/actions/crafting.ts";

interface Props {
	actions: readonly Action[],
}

const skillActions = {
	Farming: [FarmPlant],
	Exploring: [ExploreArea],
	Fishing: [ManualFishing, NetFishing],
	Crafting: [CraftItem],
};

export default class ActionDisplay extends Component<Props> {
	render() {
		let actions: {[K in keyof typeof skillActions]?: Action} = {};
		let skills = Object.keys(skillActions) as Array<keyof typeof skillActions>;
		
		for(let action of this.props.actions) {
			for(let skill of skills) {
				if(actions[skill] !== undefined) {
					continue;
				}

				for(let ProviderClass of skillActions[skill]) {
					if(action instanceof ProviderClass) {
						actions[skill] = action;
						break;
					}
				}
			}
		}

		let activeKeys = Object.keys(actions) as Array<keyof typeof skillActions>;
		if (activeKeys.length === 0) {
			return null;
		}

		return (
			<div class="bg-white m-3 rounded-md border-1 border-slate-200 p-2 grid grid-cols-[auto_1fr] gap-2">
				{activeKeys.map(skill => {
					const action = actions[skill];
					if (!action) return null;

					return (
						<Fragment key={skill}>
							<strong>{skill}</strong>
							<div><ActionRenderer  action={action} /></div>
						</Fragment>
					);
				})}
			</div>
		);
	}
}
