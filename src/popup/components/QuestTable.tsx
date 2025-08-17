import {Component} from "preact";
import {NextState} from "../../algorithm/search.ts";

interface Props {
	state: NextState[]|null,
	finish: boolean
}

export default class QuestTable extends Component<Props, any> {
	render() {
		if(!this.props.state){
			return <div>Computing...</div>;
		}

		let lastActionLength = 0;
		let lastState = this.props.state[this.props.state.length-1];
		let lastTimeTaken = 0;
		return (
			<div>
				<table border="1">
					<thead>
						<tr>
							<th>#</th>
							<th>Quest</th>
							<th>Actions</th>
							<th>Time</th>
						</tr>
					</thead>
					<tbody>
						{this.props.state.map((state, index) => {
							let newActions=  state.actions.slice(lastActionLength);
							if(newActions.length === 0){
								return null;
							}
							let timeTaken = state.timeTaken - lastTimeTaken;
							lastActionLength = state.actions.length;
							lastTimeTaken = state.timeTaken;
							let lastCompletedQuest = state.state.completedObjectives[state.state.completedObjectives.length - 1];
							return (
								<tr>
									<td>{index + 1}</td>
									<td>{lastCompletedQuest?.quest?.name}</td>
									<td>
										<ol>{newActions.map((i) => (<li>{i.toString()}</li>))}</ol>
									</td>
									<td>{timeTaken/(60*1000)} min</td>
								</tr>
							);
						})}
					</tbody>
				</table>
				<strong>Quest remaining</strong>
				<ol>
					{lastState.state.objectives.map((i) => <li>{i.quest?.name}</li>)}
				</ol>
			</div>
		)
	}
}