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
  cropName: string;
  seedQty: number;
  seedUnit: string;
  costSeed: number;
  costFertilizer: number;
  costPesticide: number;
  costLabor: number;
  costFuel: number;
  costOther: number;
  cost: number; // sum of all cost fields above
  yieldQty: number;
  yieldUnit: string;
  saleDate: string; // YYYY-MM-DD
  pricePerUnit: number;
  revenue: number;
  profit: number;
  note: string;
  receiptUrl: string | null;
  receiptPath: string | null;
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
