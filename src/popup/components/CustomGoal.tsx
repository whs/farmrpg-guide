import { Component } from "preact";

interface Props {
	onAddItemGoal: (itemName: string, amount: number) => void;
}

interface State {
	itemName: string;
	amount: number;
}

export default class CustomGoal extends Component<Props, State> {
	state: State = {
		itemName: "",
		amount: 0,
	};

	handleItemNameChange = (e: InputEvent) => {
		this.setState({ itemName: (e.target as HTMLInputElement).value });
	};

	handleTargetAmountChange = (e: InputEvent) => {
		let amount = parseInt((e.target as HTMLInputElement).value, 10);
		if(isNaN(amount)){
			return;
		}
		this.setState({ amount: amount });
	};

	handleSubmitItem = (e: SubmitEvent) => {
		e.preventDefault();
		if (this.state.itemName.trim()) {
			this.props.onAddItemGoal(this.state.itemName, this.state.amount);
			this.setState({ itemName: "", amount: 0 });
		}
	};

	render() {
		return (
			<div class="bg-white m-3 rounded-md border border-slate-200 p-2">
				<strong>Add Items goal</strong>
				<form onSubmit={this.handleSubmitItem} class="flex flex-wrap gap-2">
					<div class="flex-1">
						<label for="itemName" class="text-xs font-medium">Item</label>
						<input
							type="text"
							id="itemName"
							value={this.state.itemName}
							onInput={this.handleItemNameChange}
							placeholder="Corn"
							class="border border-slate-300 rounded p-1 text-xs w-full"
							required
						/>
					</div>
					
					<div class="flex-1">
						<label for="targetAmount" class="text-xs font-medium">Target</label>
						<div>
							<input
								type="number"
								id="targetAmount"
								value={this.state.amount}
								onInput={this.handleTargetAmountChange}
								placeholder="200"
								class="border border-slate-300 rounded p-1 text-xs w-full peer"
								required
								min="1"
							/>
							<div class="mt-1 text-xs text-slate-500 hidden peer-focus:block">
								Target amount (not additional)
							</div>
						</div>
					</div>
					
					<input type="submit" class="hidden" />
				</form>
			</div>
		);
	}
}
