import type { Farmer, FarmCropEntry, HarvestEntry } from './types';

function normalizePhone(mobile: string) {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export function combinedStatementStats(farmer: Farmer, harvestEntries: HarvestEntry[], cropEntries: FarmCropEntry[]) {
  const harvestingPending = Math.round(
    harvestEntries.filter((e) => e.farmerId === farmer.id).reduce((s, e) => s + e.pendingAmount, 0) * 100
  ) / 100;

  const vaadiProfit = Math.round(
    cropEntries.filter((e) => e.farmerId === farmer.id).reduce((s, e) => s + e.profit, 0) * 100
  ) / 100;

  const sharePercent = farmer.profitSharePercent ?? 0;
  const vaadiShareAmount = Math.round(vaadiProfit * (sharePercent / 100) * 100) / 100;

  return { harvestingPending, vaadiProfit, sharePercent, vaadiShareAmount };
}

export function whatsAppCombinedStatementUrl(
  farmer: Farmer,
  stats: ReturnType<typeof combinedStatementStats>
) {
  const message = `Namaste ${farmer.name},\n\nHarvesting Pending: ₹${stats.harvestingPending}\n\nVaadi (Farm) Profit: ₹${stats.vaadiProfit}\nTamaro Hisso (${stats.sharePercent}%): ₹${stats.vaadiShareAmount}\n\nThank you.`;
  return `https://wa.me/${normalizePhone(farmer.mobile)}?text=${encodeURIComponent(message)}`;
}
