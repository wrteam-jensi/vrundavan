export type Category = 'produce' | 'crops' | 'fruits';

export interface ProduceItem {
  id: string;
  emoji: string;
  name: string;
  tag: string;
  desc: string;
  order: number;
}

export interface Settings {
  ratePerHour: number;
}

export interface Farmer {
  id: string;
  name: string;
  mobile: string;
  village: string;
  farmDetails: string;
  profitSharePercent: number;
}

export interface HarvestEntry {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerMobile: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  hours: number;
  ratePerHour: number;
  totalAmount: number;
  advanceAmount: number;
  paidAmount: number;
  pendingAmount: number;
  note: string;
  createdAt: number;
}

export interface FarmCropEntry {
  id: string;
  farmerId: string;
  farmerName: string;
  cropName: string;
  date: string; // YYYY-MM-DD
  cost: number;
  revenue: number;
  profit: number;
  note: string;
  createdAt: number;
}

export interface CropFruitItem {
  id: string;
  emoji: string;
  imageUrl: string | null;
  imagePath: string | null;
  name: string;
  local: string;
  desc: string;
  order: number;
}
