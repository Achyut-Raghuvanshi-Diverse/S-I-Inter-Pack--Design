export type PlantStatus = 'On target' | 'Behind' | 'Over capacity';
export type VehicleSegment = 'Passenger' | 'Commercial' | 'Utility';
export type UserRole = 'Corporate Admin' | 'Plant Operator' | 'Sales';
export type ScanStage = 'Raw Material In' | 'WIP' | 'QC Pass' | 'Packed' | 'Dispatched';

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
  stage: ScanStage;
  articleId: number;
  articleCode: string;
  articleName: string;
  quantity: number;
  batch: string;
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

