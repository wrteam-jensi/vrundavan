export type Category = 'produce' | 'crops' | 'fruits';

export interface ProduceItem {
  id: string;
  emoji: string;
  name: string;
  tag: string;
  desc: string;
  order: number;
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
