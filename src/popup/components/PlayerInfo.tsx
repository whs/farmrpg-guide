import { Component } from "preact";
import { SearchState } from "../../algorithm/types";

interface Props {
	state: SearchState
}

function Info(key: string, value: any, title="") {
	return (
		<div class="flex gap-1 justify-between" title={title}>
			<div class="text-slate-700 tracking-tight">{key}</div>
			<div class="">{value}</div>
		</div>
	)
}

export default class PlayerInfo extends Component<Props, {}> {
	render() {
		let pi = this.props.state.playerInfo;
		return (
			<div class="bg-slate-300 m-3 rounded-md border-1 border-slate-800 p-2 text-xs">
				<div class="mb-1">
					<span class="font-bold inline mr-1">Player Info</span>
					<span class="text-slate-800">Hover over item for updating guide</span>
				</div>
				<div class="flex flex-wrap gap-x-3">
					{Info("Max Inventory", pi.maxInventory, "Open inventory")}
					{Info("Farm Size", pi.farmSize, "Plant in all farm plots and open Home")}
					{Info("Max Stamina", pi.maxStamina)}
					{Info("Perks", pi.perks.length, "Open Perks")}
					{Info("Gold Perks", pi.goldPerks.length, "Open Farm Store")}
				</div>
				<div class="font-bold my-1">Levels</div>
				<div class="flex flex-wrap gap-x-3">
					{Info("Farming", pi.skills.farming, "Refresh game")}
					{Info("Fishing", pi.skills.fishing, "Refresh game")}
					{Info("Crafting", pi.skills.crafting, "Refresh game")}
					{Info("Exploring", pi.skills.exploring, "Refresh game")}
					{Info("Cooking", pi.skills.cooking || 1, "Refresh game")}
					{Info("Mining", pi.skills.mining || 1, "Refresh game")}
				</div>
				<div class="font-bold my-1">Daily</div>
				<div class="flex flex-wrap gap-x-3">
					{Info("Eggs", pi.coopEggs, "Open Chicken Coop")}
					{Info("Feathers", pi.coopFeathers, "Open Chicken Coop")}
					{Info("Milk", pi.pastureMilk, "Open Pasture")}
					{Info("Apple", pi.orchardApple, "Open Orchard")}
					{Info("Orange", pi.orchardOrange, "Open Orchard")}
					{Info("Lemon", pi.orchardLemon, "Open Orchard")}
					{Info("Grapes", pi.vineyardGrapes, "Open Vineyard")}
				</div>
				<div>
					<div class="font-bold my-1">Hourly</div>
					<div class="flex flex-wrap gap-x-3">
						{Info("Board", pi.sawmillBoard, "Open Sawmill")}
						{Info("Wood", pi.sawmillWood, "Open Sawmill")}
						{Info("Steel", pi.steelworksSteel, "Open Steelworks")}
						{Info("Steel Wires", pi.steelworksSteelWire, "Open Steelworks")}
					</div>
				</div>
				<div>
					<div class="font-bold my-1">Every 10 min</div>
					<div class="flex flex-wrap gap-x-3">
						{Info("Straw", pi.hayfieldStraw, "Open Hayfield")}
						{Info("Stone", pi.quarryStone, "Open Quarry")}
						{Info("Coal", pi.quarryCoal, "Open Quarry")}
					</div>
				</div>
			</div>
		);
	}
}
