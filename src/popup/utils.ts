import { arrayToUint16 } from "../algorithm/search";
import { SearchState } from "../algorithm/types";
import { getQuestInfo } from "../data/buddyfarm";
import { Quest, QuestType } from "../types";

export async function getSearchState(): Promise<SearchState> {
	let db = await chrome.storage.local.get(["quests", "inventory", "maxInventorySize", "silver", "skills", "coopEggs", "coopFeathers", "pastureMilk", "sawmillBoard", "sawmillWood", "hayfieldStraw", "quarryStone", "quarryCoal", "orchardApple", "orchardOrange", "orchardLemon", "vineyardGrapes", "steelworksSteel", "steelworksSteelWire", "farmSize", "perks", "goldPerks", "ignoredQuests"]);

	let ignoredQuests = new Set(db.ignoredQuests || []);

	return {
		inventory: arrayToUint16(db.inventory as number[]),
		silver: db.silver,
		objectives: await Promise.all(
			(db.quests as Quest[])
				.filter(quest => [QuestType.Normal, QuestType.Special].includes(quest.type))
				.map(async (quest) => {
					let info = await getQuestInfo(quest.name);
					return {
						quest: info,
						ignored: ignoredQuests.has(quest.name),
					};
				})),
		completedObjectives: [],

		playerInfo: {
			maxInventory: db.maxInventorySize,
			skills: db.skills,
			farmSize: db.farmSize || 16,
			// TODO
			maxStamina: 30,
			perks: db.perks || [],
			goldPerks: db.goldPerks || [],

			coopEggs: db.coopEggs || 0,
			coopFeathers: db.coopFeathers || 0,
			pastureMilk: db.pastureMilk || 0,
			sawmillBoard: db.sawmillBoard || 0,
			sawmillWood: db.sawmillWood || 0,
			hayfieldStraw: db.hayfieldStraw || 0,
			quarryStone: db.quarryStone || 0,
			quarryCoal: db.quarryCoal || 0,
			orchardApple: db.orchardApple || 0,
			orchardOrange: db.orchardOrange || 0,
			orchardLemon: db.orchardLemon || 0,
			vineyardGrapes: db.vineyardGrapes || 0,
			steelworksSteel: db.steelworksSteel || 0,
			steelworksSteelWire: db.steelworksSteelWire || 0,
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
