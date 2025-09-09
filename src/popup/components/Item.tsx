import { Component } from "preact";
import { ItemInfo, getItemInfo, getItemName } from "../../data/buddyfarm";

interface ItemProps {
	itemId?: number;
	item?: ItemInfo;
	label?: boolean;
}

interface ItemState {
	itemInfo: ItemInfo | null;
}

export default class Item extends Component<ItemProps, ItemState> {
	state = {
		itemInfo: this.props.item || null
	}

	componentDidMount() {
		this.#fetchItemInfo();
	}

	componentDidUpdate(prevProps: ItemProps) {
		if (prevProps.itemId !== this.props.itemId || prevProps.item !== this.props.item) {
			this.#fetchItemInfo();
		}
	}

	async #fetchItemInfo() {
		if (this.props.item) {
			this.setState({ itemInfo: this.props.item });
			return;
		} else if (this.props.itemId) {
			let itemName = await getItemName(this.props.itemId);
			let itemInfo = await getItemInfo(itemName);
			this.setState({ itemInfo });
		} else {
			this.setState({ itemInfo: null });
		}
	}

	render() {
		if (!this.state.itemInfo) {
			return null;
		}

		let showLabel = this.props.label !== false;
		let image = new URL(this.state.itemInfo.image, "https://farmrpg.com");
		return (
			<span class="inline" title={showLabel ? this.state.itemInfo.description : this.state.itemInfo.name}>
				<img class="inline h-[1.5em]" aria-hidden src={image.toString()} alt="" />{showLabel && ` ${this.state.itemInfo.name}`}
			</span>
		);
	}
}
