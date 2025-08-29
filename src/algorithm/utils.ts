import {enableMapSet, WritableDraft} from "immer";
import {GameplayError, SearchState} from "./types";

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

export function increaseInventoryItem(inventory: WritableDraft<Uint16Array>, itemId: number, amount: number, maxInventory: number){
	if(!itemId){
		throw new Error("Missing itemId");
	}
	let newValue = Math.min(inventory[itemId] + amount, maxInventory);
	if (newValue < 0){
		throw new GameplayError(`attempting to add item ${itemId} by ${amount} but only have ${inventory[itemId]}`)
	}
	inventory[itemId] = newValue;
}

export function increaseSilver(state: WritableDraft<SearchState>, amount: number){
	let lastSilver = state.silver;
	state.silver += amount;
	if (state.silver < 0){
		throw new GameplayError(`attempting to remove silver by ${amount} but only have ${lastSilver}`)
	}
}
