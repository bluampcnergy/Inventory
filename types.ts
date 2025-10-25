export enum ReceivedGoodStatus {
  ND = 'ND', // Not Damaged
  PR = 'PR', // Partially Received
  D = 'D',   // Damaged
  Other = 'Other'
}

export interface ReceivedGood {
  id: string;
  name: string;
  makeModel: string;
  supplier: string;
  quantity: number;
  status: ReceivedGoodStatus;
  damagedCount: number;
  invoiceNumber: string;
  serials: string[];
  timestamp: number;
}

export interface RecipeComponent {
  receivedGoodId: string;
  quantityPerUnit: number;
}

export interface Recipe {
  id: string;
  name: string;
  components: RecipeComponent[];
}

export interface WIPItem {
  id: string;
  recipeId: string;
  quantity: number;
  timestamp: number;
  consumedSerials?: { [receivedGoodId: string]: string[] };
}

export interface RepairItem {
  id: string;
  finishedGoodId: string;
  recipeId: string;
  unitId: string;
  timestamp: number;
}

export interface FinishedGood {
  id: string;
  recipeId: string;
  quantity: number;
  qualityRemarks: string;
  deliveredTo: string;
  timestamp: number;
  consumedSerials?: { [receivedGoodId: string]: string[] };
  inRepairUnitIds?: string[];
  repairedUnitIds?: string[];
}

export interface User {
  username: string;
  password: string; // In a real app, this would be a hash
  role: 'admin' | 'user';
}

export interface LogEntry {
  id: string;
  timestamp: number;
  username: string;
  action: string;
  details: string;
}