import {Quest, QuestType} from "../types.ts";

function getMutationCenterPage(records: MutationRecord[]){
	for(let record of records){
		if(record.addedNodes.length === 0){
			continue;
		}
		for(let addedNode of record.addedNodes){
			if(addedNode instanceof HTMLDivElement) {
				if (addedNode.classList.contains("page-on-center") || addedNode.classList.contains("page-from-right-to-center")) {
					return addedNode;
				}
			}
		}
	}
}

async function handleInventoryPage(page: HTMLDivElement){
	let maxInventorySize = 200;

	for(let content of page.querySelectorAll(".card-content-inner")){
		let match = content.textContent.match(/have more than ([0-9]+) of any single thing/);
		if(!match){
			continue;
		}
		maxInventorySize = parseInt(match[1], 10);
	}

	let inventory: number[] = [];
	let items = page.querySelectorAll(".list-group>ul>li:not(.list-group-title)");
	let itemNames: Record<string, string> = (await chrome.storage.local.get("itemNames")).itemNames || {};
	for(let item of items) {
		let itemIdMatch = (item.firstElementChild as HTMLAnchorElement)?.getAttribute("href")?.match(/\?id=([0-9]+)$/);
		if(!itemIdMatch) {
			continue;
		}
		let itemId = parseInt(itemIdMatch[1], 10);
		let itemName = item.querySelector(".item-title strong")!!.textContent;
		let itemCount = parseInt(item.querySelector(".item-after")!!.textContent, 10);
		inventory[itemId] = itemCount;
		itemNames[itemId] = itemName;
	}

	await chrome.storage.local.set({
		itemNames,
		maxInventorySize,
		inventory,
	})
}

async function handleQuestsPage(page: HTMLDivElement) {
	let activeSection: QuestType|null = null;
	let quests: Partial<Quest>[] = [];
	let items = page.querySelectorAll(".content-block .content-block-title, .content-block .card");
	for (let item of items) {
		if (item.classList.contains("content-block-title")){
			if(item.textContent.match(/^Special Requests/)){
				activeSection = QuestType.Special;
			}else if(item.textContent.match(/^Active Requests/)){
				activeSection = QuestType.Normal;
			}else if(item.textContent.match(/^Personal Requests/)){
				activeSection = QuestType.Personal;
			}else if(item.textContent.match(/^Request Totals/)){
				activeSection = null;
			}
		} else {
			if(activeSection === null){
				continue;
			}
			let questsInBlock = item.querySelectorAll("ul>li>a");
			for(let quest of questsInBlock) {
				let questName = quest.querySelector(".item-title strong")!!.textContent;
				quests.push({
					name: questName,
					type: activeSection,
				})
			}
		}
	}

	await chrome.storage.local.set({
		quests,
	})
}

let skillRegex = /([A-Za-z]+)Level[ ]+([0-9]+)/;
async function handleIndexPage(page: HTMLDivElement){
	let skillLevels: Record<string, number> = {};
	for(let skill of page.querySelectorAll('a[href^="progress.php?type="]')){
		let parsed = skillRegex.exec(skill.parentElement!!.textContent)!!;
		skillLevels[parsed[1].toLowerCase()] = parseInt(parsed[2], 10);
	}
	chrome.storage.local.set({"skills": skillLevels});
}

let pageChangeMonitor = new MutationObserver((records) => {
	let silverIcon = document.querySelector('a[href="bank.php"] img[alt="Silver"]');
	if(silverIcon !== null){
		let silver = silverIcon.nextElementSibling?.textContent.replace(/,/g, "")!!;
		chrome.storage.local.set({"silver": parseInt(silver, 10)});
	}

	let page = getMutationCenterPage(records);
	if(!page){
		return;
	}

	if(page.dataset["page"] === "inventory" || page.querySelector(".navbar-on-center .center")?.textContent === "My Inventory"){
		handleInventoryPage(page);
	}else if(page.dataset["page"] === "quests" || page.querySelector(".navbar-on-center .center")?.textContent === "Help Needed"){
		handleQuestsPage(page);
	}else if(page.dataset["page"] === "index-1"){
		handleIndexPage(page);
	}
});
let pages = document.querySelector("#fireworks .pages")!!;
pageChangeMonitor.observe(pages, {
	childList: true,
});

let indexPage = document.querySelector('div[page="index-1"]');
if(indexPage) {
	handleIndexPage(indexPage as HTMLDivElement);
}
