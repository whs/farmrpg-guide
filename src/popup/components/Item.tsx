import { ItemInfo } from "../../data/buddyfarm";

export default (props: {item: ItemInfo}) => {
	let image = new URL(props.item.image, "https://farmrpg.com");
	return <span class="inline"><img class="inline h-[1.5em]" src={image.toString()} /> {props.item.name}</span>;
}
