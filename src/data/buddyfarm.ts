import { memoize } from "es-toolkit";
import type {Item, Quest, Location} from "./types/graphql";

export type ItemInfo = Item;
export type QuestInfo = Quest;
export type LocationInfo = Location;

export function slugify(name: string): string {
	// https://github.com/coderanger/buddy.farm/blob/b39a24d3a6acc0dc3262354a61711495d59c5a9f/gatsby-node.ts#L41
	return name.trim().toLowerCase().replace(/\W+/g, "-")
}

async function cacheFill<T>(
	object: string,
	slug: string,
	fetchFunc: (slug: string) => Promise<T>
): Promise<T> {
	// Check chrome.storage.local cache first
	const storageKey = `buddyfarm:${object}:${slug}`;
	if (typeof chrome !== 'undefined' && chrome.storage) {
		const result = await chrome.storage.local.get(storageKey);
		const cached = result[storageKey];
		if (cached) {
			return cached;
		}
	}
	
	// Fetch and cache
	const data = await fetchFunc(slug);
	if (typeof chrome !== 'undefined' && chrome.storage) {
		chrome.storage.local.set({ [storageKey]: data });
	}
	
	return data;
}

const itemNameCache = new Map<number, string>();

const fetchQuestData = memoize((slug: string): Promise<QuestInfo> => {
	return cacheFill('quest', slug, async (slug: string) => {
		const data = await (await fetch(`https://buddy.farm/page-data/q/${slug}/page-data.json`)).json();
		return data.result.data.farmrpg.quests[0] as QuestInfo;
	});
});

export function getQuestInfo(questNameOrSlug: string): Promise<QuestInfo> {
	const slug = slugify(questNameOrSlug);
	return fetchQuestData(slug);
}

const fetchItemData = memoize(async (slug: string): Promise<ItemInfo> => {
	let out = await cacheFill('item', slug, async (slug: string) => {
		const data = await (await fetch(`https://buddy.farm/page-data/i/${slug}/page-data.json`)).json();
		return data.result.data.farmrpg.items[0] as ItemInfo;
	});

	itemNameCache.set(out.id, out.name);

	for(let locksmithItem of out.locksmithItems){
		itemNameCache.set(locksmithItem.outputItem.id, locksmithItem.outputItem.name);
	}

	return out;
});

export function getItemInfo(itemNameOrSlug: string): Promise<ItemInfo> {
	const slug = slugify(itemNameOrSlug);
	return fetchItemData(slug);
}

/**
 * Return itemInfo of item by ID. Will never resolve if item has never been read by getItemInfo before calling this function
 */
export async function getItemName(itemId: number): Promise<string> {
	let out = itemNameCache.get(itemId);
	if(out){
		return out;
	}
	return new Promise(() => {
		console.warn("Unknown item ID requested", itemId);
		// TODO: Fetch item info
	});
}

const fetchLocationData = memoize(async (slug: string): Promise<LocationInfo> => {
	let out = await cacheFill('location', slug, async (slug: string) => {
		const data = await (await fetch(`https://buddy.farm/page-data/l/${slug}/page-data.json`)).json();
		return data.result.data.farmrpg.locations[0] as LocationInfo;
	});

	for(let dropRate of out.dropRates){
		for(let item of dropRate.items){
			itemNameCache.set(item.item.id, item.item.name);
		}
	}

	return out;
});

export function getLocationInfo(locationNameOrSlug: string): Promise<LocationInfo> {
	const slug = slugify(locationNameOrSlug);
	return fetchLocationData(slug);
}

export function isFarmable(item: ItemInfo): boolean {
	return !!(item.baseYieldMinutes && item.baseYieldMinutes > 0);
}

export async function seedOf(item: ItemInfo): Promise<ItemInfo|null> {
	for(let method of item.dropRatesItems) {
		if(!method.dropRates.seed) {
			continue;
		}
		return await getItemInfo(method.item.name);
	}
	return null;
}

export function isExplorable(item: ItemInfo): boolean {
	return item.dropRatesItems.some((dropRate) => {
		// TODO: Handle locked locations
		return dropRate.dropRates.location?.type === "explore";
	});
}

export const getFishingAreas = memoize(async (): Promise<string[]> => {
	return await cacheFill('fishing', "", async () => {
		const data = await (await fetch(`https://buddy.farm/page-data/fishing/page-data.json`)).json();
		return data.result.data.farmrpg.locations.map((area: any) => area.name) as string[];
	});
});

export const getExploringArea = memoize(async (): Promise<string[]> => {
	return await cacheFill('exploring', "", async () => {
		const data = await (await fetch(`https://buddy.farm/page-data/exploring/page-data.json`)).json();
		return data.result.data.farmrpg.locations.map((area: any) => area.name) as string[];
	});
});
