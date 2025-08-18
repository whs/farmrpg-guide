import { arrayToUint16 } from "../algorithm/search";
import { SearchState } from "../algorithm/types";
import { getQuestInfo } from "../data/buddyfarm";
import { Quest, QuestType } from "../types";

export async function getSearchState(): Promise<SearchState> {
	let { quests, inventory, maxInventorySize, silver, skills } = await chrome.storage.local.get(["quests", "inventory", "maxInventorySize", "silver", "skills"]);

	return {
		inventory: arrayToUint16(inventory as number[]),
		silver,
		objectives: await Promise.all(
			(quests as Quest[])
				.filter(quest => [QuestType.Normal, QuestType.Special].includes(quest.type))
				.map(async (quest) => {
					let info = await getQuestInfo(quest.name);
					return {
						quest: info,
					};
				})),
		completedObjectives: [],

		playerInfo: {
			maxInventory: maxInventorySize,
			skills,
			// TODO
			farmSize: 28,
			maxStamina: 30,
		},
	};
}

export function formatDuration(durs: number): string {
	const HOUR = (60000 * 60);
	const DAY = 24 * HOUR;
	if (durs === 0) {
		return "-";
	} else if (durs < 1000) {
		return `${Math.ceil(durs)}ms`;
	} else if (durs < 60000) {
		return `${Math.ceil(durs/1000)} s`;
	} else if (durs < HOUR) {
		return `${Math.ceil(durs/60000)} min`;
	} else if (durs < DAY) {
		return `${Math.ceil((durs*10)/HOUR)/10} hr`;
	} else {
		return `${Math.ceil((durs*10)/DAY)/10} days`;
	}
}
