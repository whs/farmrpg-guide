import type {Item, Quest, Location} from "./types/graphql";

export type ItemInfo = Item;
export type QuestInfo = Quest;
export type LocationInfo = Location;

const QUEST_CACHE: Record<string, Quest> = {};
const ITEM_CACHE: Record<string, Item> = {};
const LOCATION_CACHE: Record<string, Location> = {};

export function slugify(name: string): string {
	// https://github.com/coderanger/buddy.farm/blob/b39a24d3a6acc0dc3262354a61711495d59c5a9f/gatsby-node.ts#L41
	return name.trim().toLowerCase().replace(/\W+/g, "-")
}

async function getCachedOrFetch<T>(
	object: string,
	nameOrSlug: string,
	cache: Record<string, T>,
	fillFunc: (slug: string) => Promise<T>
): Promise<T> {
	const slug = slugify(nameOrSlug);
	
	// 1. Check in-memory cache
	if (cache[slug]) {
		return cache[slug];
	}
	
	// 2. Check chrome.storage.local cache
	const storageKey = `buddyfarm:${object}:${slug}`;
	if (typeof chrome !== 'undefined' && chrome.storage) {
		const result = await chrome.storage.local.get(storageKey);
		const cached = result[storageKey];
		if (cached) {
			cache[slug] = cached;
			return cached;
		}
	}
	
	// Cache fill
	const data = await fillFunc(slug);
	
	// Cache fill
	cache[slug] = data;
	chrome.storage.local.set({ [storageKey]: data });
	
	return data;
}

export async function getQuestInfo(questNameOrSlug: string): Promise<QuestInfo> {
	return getCachedOrFetch('quest', questNameOrSlug, QUEST_CACHE, async (slug: string) => {
		const data = await (await fetch(`https://buddy.farm/page-data/q/${slug}/page-data.json`)).json();
		return data.result.data.farmrpg.quests[0] as QuestInfo;
	});
}

export async function getItemInfo(itemNameOrSlug: string): Promise<ItemInfo> {
	return getCachedOrFetch('item', itemNameOrSlug, ITEM_CACHE, async (slug: string) => {
		const data = await (await fetch(`https://buddy.farm/page-data/i/${slug}/page-data.json`)).json();
		return data.result.data.farmrpg.items[0] as ItemInfo;
	});
}

export async function getLocationInfo(locationNameOrSlug: string): Promise<LocationInfo> {
	return getCachedOrFetch('location', locationNameOrSlug, LOCATION_CACHE, async (slug: string) => {
		const data = await (await fetch(`https://buddy.farm/page-data/l/${slug}/page-data.json`)).json();
		return data.result.data.farmrpg.locations[0] as LocationInfo;
	});
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
	for (let method of item.dropRatesItems) {
		if(method.dropRates.location !== null) {
			return true;
		}
	}
	return false;
}