import { ItemInfo } from "../../data/buddyfarm";

export default (props: {item: ItemInfo}) => {
	let image = new URL(props.item.image, "https://farmrpg.com");
	return <span class="inline" title={props.item.description}><img class="inline h-[1.5em]" aria-hidden src={image.toString()} alt="" /> {props.item.name}</span>;
}
