import { LocationInfo } from "../../data/buddyfarm";

export default (props: {location: LocationInfo}) => {
	let image = new URL(props.location.image, "https://farmrpg.com");
	return <span class="inline"><img class="inline h-[1.5em]" src={image.toString()} /> {props.location.name}</span>;
}
