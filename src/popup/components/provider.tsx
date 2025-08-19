import { ComponentType, h } from "preact";
import { Provider } from "../../algorithm/types";
import { BuyItemStore, BuySteak, BuySteakKabob, CraftItem, ExploreArea, FarmPlant, ManualFishing, NetFishing, SubmitQuest } from "../../algorithm/provider";
import Item from "./Item";
import Location from "./Location";

type ProviderClass<T extends Provider> = new (...args: any[]) => T;

const providerComponent = new Map<ProviderClass<any>, ComponentType<{ action: any }>>();

providerComponent.set(SubmitQuest, (props: {action: SubmitQuest}) => {
	return <li>Submit quest <strong>{props.action.quest.name}</strong></li>;
});

providerComponent.set(FarmPlant, (props: {action: FarmPlant}) => {
	return <li><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/6137.png" /> Farm <strong><Item item={props.action.output} /></strong> ×{props.action.desired}</li>;
});

providerComponent.set(ExploreArea, (props: {action: ExploreArea}) => {
	return (
		<li>
			<div><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/6075.png" /> Explore <strong><Location location={props.action.area} /></strong> ×{Math.ceil(props.action.getAttemptsRequired())}</div>
			<div>Find <strong><Item item={props.action.item} /></strong> ×{props.action.amount}</div>
		</li>
	);
});

providerComponent.set(BuyItemStore, (props: {action: BuyItemStore}) => {
	if(props.action.getTimeRequired() === 0){
		return null;
	}
	return (
		<li><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/silver.png" /> Buy <strong><Item item={props.action.item} /></strong> ×{props.action.amount}</li>
	);
});

providerComponent.set(BuySteak, (props: {action: BuySteak}) => {
	return (
		<li><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/silver.png" /> Buy <strong><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/steak.png" /> Steak</strong> ×{props.action.amount}</li>
	);
});

providerComponent.set(BuySteakKabob, (props: {action: BuySteakKabob}) => {
	return (
		<li><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/silver.png" /> Buy <strong><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/8898.png" /> Steak Kabob</strong> ×{props.action.amount}</li>
	);
});

providerComponent.set(ManualFishing, (props: {action: ManualFishing}) => {
	return (
		<li>
			<div><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/7783.png" /> Manual Fish <strong><Location location={props.action.area} /></strong> ×{Math.ceil(props.action.getAttemptsRequired())}</div>
			<div>for <Item item={props.action.item} /> ×{props.action.amount}</div>
		</li>
	);
});

providerComponent.set(NetFishing, (props: {action: NetFishing}) => {
	return (
		<li>
			<div><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/7748.png" /> Net <strong><Location location={props.action.area} /></strong> ×{Math.ceil(props.action.getAttemptsRequired()/props.action.getRollPerNet())}</div>
			<div>for <Item item={props.action.item} /> ×{props.action.amount}</div>
		</li>
	);
});

providerComponent.set(CraftItem, (props: {action: CraftItem}) => {
	return (
		<li><img class="inline h-[1.5em]" src="https://farmrpg.com/img/items/5868.png" /> Craft <strong><Item item={props.action.item} /></strong> ×{props.action.craftTimes}</li>
	);
});

export function ActionRenderer<T extends Provider>(props: {action: T}) {
	let component = providerComponent.get(Object.getPrototypeOf(props.action).constructor);
	if (!component) {
		return <li>{props.action.toString()}</li>;
	}

	return h(component, {
		action: props.action,
	})
}

export default providerComponent
