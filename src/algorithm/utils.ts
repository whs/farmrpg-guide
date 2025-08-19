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
