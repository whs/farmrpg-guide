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

const fetchItemData = memoize((slug: string): Promise<ItemInfo> => {
	return cacheFill('item', slug, async (slug: string) => {
		const data = await (await fetch(`https://buddy.farm/page-data/i/${slug}/page-data.json`)).json();
		return data.result.data.farmrpg.items[0] as ItemInfo;
	});
});

export function getItemInfo(itemNameOrSlug: string): Promise<ItemInfo> {
	const slug = slugify(itemNameOrSlug);
	return fetchItemData(slug);
}

const fetchLocationData = memoize((slug: string): Promise<LocationInfo> => {
	return cacheFill('location', slug, async (slug: string) => {
		const data = await (await fetch(`https://buddy.farm/page-data/l/${slug}/page-data.json`)).json();
		return data.result.data.farmrpg.locations[0] as LocationInfo;
	});
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
