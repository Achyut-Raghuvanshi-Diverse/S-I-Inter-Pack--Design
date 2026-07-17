export type PlantStatus = 'On target' | 'Behind' | 'Over capacity';
export type VehicleSegment = 'Passenger' | 'Commercial' | 'Utility';
export type UserRole = 'Corporate Admin' | 'Plant Operator' | 'Sales';
export type ScanSource = 'Camera' | 'Manual';

export interface Plant {
  id: number;
  code: string;
  name: string;
  location: string;
  state: string;
  capacity: number;
  output: number;
  status: PlantStatus;
  contact: string;
  phone: string;
}

export interface Article {
  id: number;
  code: string;
  modelName: string;
  segment: VehicleSegment;
  coverType: string;
  material: string;
  unitCost: number;
  unitPrice: number;
  plantIds: number[];
  barcode: string;
  active: boolean;
}

export interface ScanRecord {
  id: number;
  timestamp: Date;
  plantId: number;
  articleId: number;
  articleCode: string;
  articleName: string;
  barcode: string;
  source: ScanSource;
  syncStatus: 'Synced' | 'Pending';
}

export interface LedgerEntry {
  id: number;
  date: string;
  plantId: number;
  articleId: number;
  customer: string;
  quantity: number;
  rate: number;
  status: 'Delivered' | 'In transit' | 'Ready';
  invoice: string;
}

export interface ProductionRow {
  plantId: number;
  target: number;
  actual: number;
  rejected: number;
}

export interface Customer {
  id: number;
  name: string;
  code: string;
  gstin: string;
  contact: string;
  phone: string;
  city: string;
  creditDays: number;
  status: 'Active' | 'On hold';
}

export interface Order {
  id: number;
  poNumber: string;
  customerId: number;
  articleId: number;
  plantId: number;
  quantity: number;
  rate: number;
  dueDate: string;
  status: 'Draft' | 'Confirmed' | 'In Production' | 'Dispatched' | 'Invoiced';
}

export interface InventoryItem {
  id: number;
  plantId: number;
  articleId: number;
  quantity: number;
  reorderLevel: number;
  ageDays: number;
  updatedAt: string;
}

export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  plantId: number | null;
  employeeCode: string;
  status: 'Active' | 'Suspended';
}
