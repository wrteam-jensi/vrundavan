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

export type ExpenseCategory = 'seed' | 'fertilizer' | 'pesticide' | 'labor' | 'fuel' | 'other';

export interface PakExpense {
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: number;
  note: string;
}

export interface Pak {
  id: string;
  cropName: string;
  plantedDate: string; // YYYY-MM-DD, vavayo
  harvestedDate: string | null; // YYYY-MM-DD, nikdyo — null = still growing
  expenses: PakExpense[];
  yieldQty: number;
  yieldUnit: string;
  pricePerUnit: number;
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
