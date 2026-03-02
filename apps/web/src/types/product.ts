export type ProductCategory = 
  | 'ROUTER' | 'MODEM' | 'ONT' | 'STB' | 'ANTENNA' 
  | 'CABLE' | 'PHONE' | 'TABLET' | 'LAPTOP' | 'SIM';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory; // Usar el tipo específico, no string
  isSerialized: boolean;
  description?: string;
}

export interface InventoryItem {
  id: string;
  branchId: string;
  productId: string;
  qtyAvailable: number;
  qtyReserved: number;
  updatedAt: string; // ISO Date-time según contrato
}

export interface SeedData {
  products: Product[];
  inventory: InventoryItem[];
  plans: any[];
}