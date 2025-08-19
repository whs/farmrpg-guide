import {Quest, QuestType} from '../types.ts';

function getMutationCenterPage(records: MutationRecord[]) {
	for (let record of records) {
		if (record.addedNodes.length === 0) {
			continue;
		}
		for (let addedNode of record.addedNodes) {
			if (addedNode instanceof HTMLDivElement) {
				if (
					addedNode.classList.contains('page-on-center') ||
					addedNode.classList.contains('page-from-right-to-center')
				) {
					return addedNode;
				}
			}
		}
	}
}

async function handleInventoryPage(page: HTMLDivElement) {
	let maxInventorySize = 200;

	for (let content of page.querySelectorAll('.card-content-inner')) {
		let match = content.textContent.match(
			/have more than ([0-9]+) of any single thing/
		);
		if (!match) {
			continue;
		}
		maxInventorySize = parseInt(match[1], 10);
	}

	let inventory: number[] = [];
	let items = page.querySelectorAll('.list-group>ul>li:not(.list-group-title)');
	let itemNames: Record<string, string> =
		(await chrome.storage.local.get('itemNames')).itemNames || {};
	for (let item of items) {
		let itemIdMatch = (item.firstElementChild as HTMLAnchorElement)
			?.getAttribute('href')
			?.match(/\?id=([0-9]+)$/);
		if (!itemIdMatch) {
			continue;
		}
		let itemId = parseInt(itemIdMatch[1], 10);
		let itemName = item.querySelector('.item-title strong')!!.textContent;
		let itemCount = parseInt(
			item.querySelector('.item-after')!!.textContent,
			10
		);
		inventory[itemId] = itemCount;
		itemNames[itemId] = itemName;
	}

	await chrome.storage.local.set({
		itemNames,
		maxInventorySize,
		inventory,
	});
}

async function handleQuestsPage(page: HTMLDivElement) {
	let activeSection: QuestType | null = null;
	let quests: Partial<Quest>[] = [];
	let items = page.querySelectorAll(
		'.content-block .content-block-title, .content-block .card'
	);
	for (let item of items) {
		if (item.classList.contains('content-block-title')) {
			if (item.textContent.match(/^Special Requests/)) {
				activeSection = QuestType.Special;
			} else if (item.textContent.match(/^Active Requests/)) {
				activeSection = QuestType.Normal;
			} else if (item.textContent.match(/^Personal Requests/)) {
				activeSection = QuestType.Personal;
			} else if (item.textContent.match(/^Request Totals/)) {
				activeSection = null;
			}
		} else {
			if (activeSection === null) {
				continue;
			}
			let questsInBlock = item.querySelectorAll('ul>li>a');
			for (let quest of questsInBlock) {
				let questName = quest.querySelector('.item-title strong')!!.textContent;
				quests.push({
					name: questName,
					type: activeSection,
				});
			}
		}
	}

	await chrome.storage.local.set({
		quests,
	});
}

const skillRegex = /([A-Za-z]+)Level[ ]+([0-9]+)/;
const growingRegex = /([0-9]+) (Growing|READY!)/;
async function handleIndexPage(page: HTMLDivElement) {
	let skillLevels: Record<string, number> = {};
	for (let skill of page.querySelectorAll('a[href^="progress.php?type="]')) {
		let parsed = skillRegex.exec(skill.parentElement!!.textContent)!!;
		skillLevels[parsed[1].toLowerCase()] = parseInt(parsed[2], 10);
	}
	chrome.storage.local.set({skills: skillLevels});

	let growing = growingRegex.exec(document.querySelector(".ready[data-id]")!!.textContent)!!;
	let {farmSize} = await chrome.storage.local.get(["farmSize"]);
	let newFarmSize = Math.max(parseInt(growing[1], 10), farmSize || 16);
	if(newFarmSize && !isNaN(newFarmSize)) {
		chrome.storage.local.set({farmSize: newFarmSize});
	}
}

const eggsRegex = /Currently, your chicken coop is producing ([0-9]+) egg[s]? and ([0-9]+) feather[s]? per day/;
async function handleCoopPage(_: HTMLDivElement) {
	let eggsFeathers = eggsRegex.exec(document.getElementById("animationArea")!!.textContent);
	if(!eggsFeathers){
		return;
	}
	chrome.storage.local.set({
		coopEggs: parseInt(eggsFeathers[1], 10),
		coopFeathers: parseInt(eggsFeathers[2], 10),
	})
}

const milkRegex = /Currently, your cow pasture is producing ([0-9]+) milk per day/;
async function handlePasturePage(_: HTMLDivElement) {
	let milk = milkRegex.exec(document.getElementById("animationArea")!!.textContent);
	if(!milk){
		return;
	}
	chrome.storage.local.set({
		pastureMilk: parseInt(milk[1], 10),
	})
}

const boardRegex = /Your sawmill will generate boards every hour.[ ]+Currently generating ([0-9]+) per hour/;
const woodRegex = /Your sawmill will generate wood every hour.[ ]+Currently generating ([0-9]+) per hour/;
async function handleSawmillPage(_: HTMLDivElement) {
	let pageContent = document.body.textContent;
	let board = boardRegex.exec(pageContent);
	let wood = woodRegex.exec(pageContent);
	chrome.storage.local.set({
		sawmillBoard: board ? parseInt(board[1], 10) : 0,
		sawmillWood: wood ? parseInt(wood[1], 10) : 0,
	})
}

const strawRegex = /Your hay field will generate straw every 10 minutes.[ ]+Currently generating ([0-9]+) Straw every 10 minutes/;
async function handleHayfieldPage(_: HTMLDivElement) {
	let pageContent = document.body.textContent;
	let straw = strawRegex.exec(pageContent);
	chrome.storage.local.set({
		hayfieldStraw: straw ? parseInt(straw[1], 10) : 0,
	})
}

const stoneRegex = /Your quarry will generate regular stone and sandstone every 10 minutes.[ ]+Currently generating ([0-9]+) every 10 minutes/;
const coalRegex = /Your quarry will generate coal every hour.[ ]+Currently generating ([0-9]+) per hour/;
async function handleQuarryPage(_: HTMLDivElement) {
	let pageContent = document.body.textContent;
	let stone = stoneRegex.exec(pageContent);
	let coal = coalRegex.exec(pageContent);
	chrome.storage.local.set({
		quarryStone: stone ? parseInt(stone[1], 10) : 0,
		quarryCoal: coal ? parseInt(coal[1], 10) : 0,
	});
}

async function handleOrchardPage(page: HTMLDivElement) {
	let appleProduction = page.querySelector('a[href="item.php?id=44"]')!!.parentElement?.querySelectorAll("strong")[1].textContent!!;
	let orangeProduction = page.querySelector('a[href="item.php?id=61"]')!!.parentElement?.querySelectorAll("strong")[1].textContent!!;
	let lemonProduction = page.querySelector('a[href="item.php?id=62"]')!!.parentElement?.querySelectorAll("strong")[1].textContent!!;

	chrome.storage.local.set({
		orchardApple: parseInt(appleProduction, 10),
		orchardOrange: parseInt(orangeProduction, 10),
		orchardLemon: parseInt(lemonProduction, 10),
	});
}

const grapesRegex = /Your vineyard will generate grapes every day.[ ]+Currently generating ([0-9]+) per day/;
async function handleVineyardPage(_: HTMLDivElement) {
	let pageContent = document.body.textContent;
	let grapes = grapesRegex.exec(pageContent);
	chrome.storage.local.set({
		vineyardGrapes: grapes ? parseInt(grapes[1], 10) : 0,
	});
}

async function handlePerksPage(page: HTMLDivElement) {
	let buttons = page.querySelectorAll('.btnblue');
	let perks = new Set<string>();

	for (let button of buttons) {
		if (button.textContent.includes('Unlocked')) {
			let perkName = button.closest('li')!!.querySelector('strong')!!.textContent;
			perks.add(perkName);
		}
	}

	chrome.storage.local.set({ perks: Array.from(perks) });
}

async function handleSupplyPage(page: HTMLDivElement) {
	let buttons = page.querySelectorAll('.btnblue');
	let perks = new Set<string>();

	for (let button of buttons) {
		if (button.textContent?.includes('Unlocked')) {
			let perkName = button.closest('li')!!.querySelector('strong')!!.textContent;
			perks.add(perkName);
		}
	}

	chrome.storage.local.set({ goldPerks: Array.from(perks) });
}

let pageChangeMonitor = new MutationObserver((records) => {
	let silverIcon = document.querySelector(
		'a[href="bank.php"] img[alt="Silver"]'
	);
	if (silverIcon !== null) {
		let silver = silverIcon.nextElementSibling?.textContent.replace(/,/g, '')!!;
		chrome.storage.local.set({silver: parseInt(silver, 10)});
	}

	let page = getMutationCenterPage(records);
	if (!page) {
		return;
	}

	if (
		page.dataset['page'] === 'inventory' ||
		page.querySelector('.navbar-on-center .center')?.textContent ===
			'My Inventory'
	) {
		handleInventoryPage(page);
	} else if (
		page.dataset['page'] === 'quests' ||
		page.querySelector('.navbar-on-center .center')?.textContent ===
			'Help Needed'
	) {
		handleQuestsPage(page);
	} else if (page.dataset['page'] === 'index-1') {
		handleIndexPage(page);
	} else if (page.dataset['page'] === 'perks') {
		handlePerksPage(page);
	} else if (page.dataset['page'] === 'supply') {
		handleSupplyPage(page);
	} else if (page.dataset['page'] === 'coop') {
		handleCoopPage(page);
	} else if (page.dataset['page'] === 'pasture') {
		handlePasturePage(page);
	} else if (page.dataset['page'] === 'sawmill') {
		handleSawmillPage(page);
	} else if (page.dataset['page'] === 'hayfield') {
		handleHayfieldPage(page);
	} else if (page.dataset['page'] === 'quarry') {
		handleQuarryPage(page);
	} else if (page.dataset['page'] === 'orchard') {
		handleOrchardPage(page);
	} else if (page.dataset['page'] === 'vineyard') {
		handleVineyardPage(page);
	}
});
let pages = document.querySelector('#fireworks .pages')!!;
pageChangeMonitor.observe(pages, {
	childList: true,
});

let indexPage = document.querySelector('div[page="index-1"]');
if (indexPage) {
	handleIndexPage(indexPage as HTMLDivElement);
}
