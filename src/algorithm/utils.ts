import {enableMapSet, original, WritableDraft} from "immer";
import {GameplayError, SearchState} from "./types";
import { invariant } from "es-toolkit";

enableMapSet()

export function getNextDailyReset(): Date {
  let out = new Date();
  out.setUTCHours(5, 8, 0, 0); // Daily reset 5:00-5:08 UTC
  
  // If now is before the reset, then return now
  if (new Date() < out) {
    return out;
  }
  
  out.setUTCDate(out.getUTCDate() + 1);
  return out;
}

export function getTimeUntilNextReset(): number {
	return getNextDailyReset().getTime() - Date.now()
}


export const MENUING_TIME = 30000;

export function increaseInventoryItem(state: WritableDraft<SearchState>, itemId: number, amount: number){
	invariant(!!itemId, "missing itemId");

	let origitalState = original(state)!;
	if(state.inventory === origitalState.inventory) {
		state.inventory = state.inventory.slice();
	}

	let newValue = state.inventory[itemId] + amount;
	if (newValue < 0){
		throw new GameplayError(`attempting to add item ${itemId} by ${amount} but only have ${state.inventory[itemId]}`)
	}
	
	let sink = 0;
	if(newValue > state.playerInfo.maxInventory){
		sink = newValue - state.playerInfo.maxInventory;
		newValue = state.playerInfo.maxInventory;
	}
	if(sink > 0){
		state.inventoryVoid.set(itemId, (state.inventoryVoid.get(itemId) || 0) + sink);
	}
	
	state.inventory[itemId] = newValue;
}

export function increaseSilver(state: WritableDraft<SearchState>, amount: number){
	let lastSilver = state.silver;
	state.silver += amount;
	if (state.silver < 0){
		throw new GameplayError(`attempting to remove silver by ${amount} but only have ${lastSilver}`)
	}
}

export function diffItemMap(old: Map<number, number>, latest: Map<number, number>): Map<number, number>{
	let out = new Map<number, number>();
	
	for (let [itemId, latestAmount] of latest.entries()) {
		const oldAmount = old.get(itemId) || 0;
		const diff = latestAmount - oldAmount;
		if (diff > 0) {
			out.set(itemId, diff);
		}
	}
	
	return out;
}
