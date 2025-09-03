import { ComponentType, h } from "preact";
import { Action } from "../../algorithm/types.ts";
import Item from "./Item.tsx";
import Location from "./Location.tsx";
import {BuyItemStore, OpenChest, SubmitQuest} from "../../algorithm/actions/ui.ts";
import {FarmPlant} from "../../algorithm/actions/farming.ts";
import {ExploreArea} from "../../algorithm/actions/exploring.ts";
import {ManualFishing, NetFishing} from "../../algorithm/actions/fishing.ts";
import {CraftItem} from "../../algorithm/actions/crafting.ts";
import {BuySteak, BuySteakKabob} from "../../algorithm/ui.ts";

type ProviderClass<T extends Action> = new (...args: any[]) => T;

const providerComponent = new Map<ProviderClass<any>, ComponentType<{ action: any }>>();

providerComponent.set(SubmitQuest, (props: {action: SubmitQuest}) => {
	let image = new URL(props.action.quest.image, "https://farmrpg.com");
	return <div>Submit quest <strong><img class="inline h-[1.5em]" src={image.toString()} aria-hidden alt="" /> {props.action.quest.name}</strong></div>;
});

providerComponent.set(FarmPlant, (props: {action: FarmPlant}) => {
	return <div><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/6137.png" aria-hidden alt="" /> Farm <strong><Item item={props.action.output} /></strong> ×{props.action.desired}</div>;
});

providerComponent.set(ExploreArea, (props: {action: ExploreArea}) => {
	return (
		<div>
			<div><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/6075.png" aria-hidden alt="" /> Explore <strong><Location location={props.action.area} /></strong> ×{Math.ceil(props.action.getAttemptsRequired())}</div>
			<div>Find <strong><Item item={props.action.item} /></strong> ×{props.action.amount}</div>
		</div>
	);
});

providerComponent.set(BuyItemStore, (props: {action: BuyItemStore}) => {
	return (
		<div><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/silver.png" aria-hidden alt="" /> Buy <strong><Item item={props.action.item} /></strong> ×{props.action.amount}</div>
	);
});

providerComponent.set(BuySteak, (props: {action: BuySteak}) => {
	return (
		<div><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/silver.png" aria-hidden alt="" /> Buy <strong><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/steak.png" /> Steak</strong> ×{props.action.amount}</div>
	);
});

providerComponent.set(BuySteakKabob, (props: {action: BuySteakKabob}) => {
	return (
		<div><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/silver.png" aria-hidden alt="" /> Buy <strong><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/8898.png" /> Steak Kabob</strong> ×{props.action.amount}</div>
	);
});

providerComponent.set(ManualFishing, (props: {action: ManualFishing}) => {
	return (
		<div>
			<div><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/7783.png" aria-hidden alt="" /> Manual Fish <strong><Location location={props.action.area} /></strong> ×{Math.ceil(props.action.getAttemptsRequired())}</div>
			<div>for <Item item={props.action.item} /> ×{props.action.amount}</div>
		</div>
	);
});

providerComponent.set(NetFishing, (props: {action: NetFishing}) => {
	return (
		<div>
			<div><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/7748.png" aria-hidden alt="" /> Net <strong><Location location={props.action.area} /></strong> ×{Math.ceil(props.action.getAttemptsRequired()/props.action.getRollPerNet())}</div>
			<div>for <Item item={props.action.item} /> ×{props.action.amount}</div>
		</div>
	);
});

providerComponent.set(CraftItem, (props: {action: CraftItem}) => {
	return (
		<div><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/5868.png" aria-hidden alt="" /> Craft <strong><Item item={props.action.item} /></strong> ×{props.action.craftTimes}</div>
	);
});

providerComponent.set(OpenChest, (props: {action: OpenChest}) => {
	return (
		<div>Open <strong><Item item={props.action.chest} /></strong> ×{props.action.amount}</div>
	);
});

export function ActionRenderer<T extends Action>(props: {action: T}) {
	let component = providerComponent.get(Object.getPrototypeOf(props.action).constructor);
	if (!component) {
		return <div>{props.action.toString()}</div>;
	}

	return h(component, {
		action: props.action,
	})
}

export default providerComponent
