import { AppUser, Article, Customer, InventoryItem, LedgerEntry, Order, Plant, ProductionRow, ScanRecord } from './models';

const HISTORY_START = new Date('2020-01-01T00:00:00.000Z');
const HISTORY_END = new Date();
const HISTORY_SPAN = HISTORY_END.getTime() - HISTORY_START.getTime();

function historyDate(index: number, total: number): Date {
  const progress = total <= 1 ? 0 : index / (total - 1);
  return new Date(HISTORY_END.getTime() - Math.round(HISTORY_SPAN * progress));
}

function isoDate(date: Date): string { return date.toISOString().slice(0, 10); }

export const INITIAL_PLANTS: Plant[] = [
  { id: 1, code: 'GGN-01', name: 'Gurgaon Plant 1', location: 'Udyog Vihar', state: 'Haryana', capacity: 18500, output: 17120, status: 'On target', contact: 'Rajesh Kumar', phone: '+91 98110 22041' },
  { id: 2, code: 'GGN-02', name: 'Gurgaon Plant 2', location: 'Udyog Vihar', state: 'Haryana', capacity: 16000, output: 16780, status: 'Over capacity', contact: 'Neeraj Saini', phone: '+91 98110 22042' },
  { id: 3, code: 'MNS-01', name: 'Manesar Plant', location: 'IMT Manesar', state: 'Haryana', capacity: 14500, output: 12450, status: 'Behind', contact: 'Pankaj Malik', phone: '+91 98110 22043' },
  { id: 4, code: 'PNQ-01', name: 'Pune Plant 1', location: 'Chakan', state: 'Maharashtra', capacity: 17000, output: 15890, status: 'On target', contact: 'Amol Patil', phone: '+91 98220 13044' },
  { id: 5, code: 'PNQ-02', name: 'Pune Plant 2', location: 'Ranjangaon', state: 'Maharashtra', capacity: 13000, output: 11240, status: 'Behind', contact: 'Sameer Shinde', phone: '+91 98220 13045' },
  { id: 6, code: 'NSK-01', name: 'Nashik Plant', location: 'Satpur MIDC', state: 'Maharashtra', capacity: 11000, output: 10340, status: 'On target', contact: 'Vijay Pawar', phone: '+91 98220 13046' },
  { id: 7, code: 'RDR-01', name: 'Rudrapur Plant 1', location: 'Pantnagar', state: 'Uttarakhand', capacity: 15000, output: 14120, status: 'On target', contact: 'Deepak Rawat', phone: '+91 98970 44047' },
  { id: 8, code: 'RDR-02', name: 'Rudrapur Plant 2', location: 'Pantnagar', state: 'Uttarakhand', capacity: 12000, output: 9940, status: 'Behind', contact: 'Manoj Bisht', phone: '+91 98970 44048' },
  { id: 9, code: 'SND-01', name: 'Sanand Plant', location: 'Sanand GIDC', state: 'Gujarat', capacity: 15000, output: 13920, status: 'On target', contact: 'Nirav Patel', phone: '+91 98250 55049' },
  { id: 10, code: 'AHM-01', name: 'Ahmedabad Plant', location: 'Changodar', state: 'Gujarat', capacity: 9500, output: 9710, status: 'Over capacity', contact: 'Harsh Shah', phone: '+91 98250 55050' },
  { id: 11, code: 'BLR-01', name: 'Bengaluru Plant', location: 'Bidadi', state: 'Karnataka', capacity: 13000, output: 12130, status: 'On target', contact: 'Kiran Rao', phone: '+91 98450 66051' },
  { id: 12, code: 'CHN-01', name: 'Chennai Plant', location: 'Oragadam', state: 'Tamil Nadu', capacity: 14500, output: 13560, status: 'On target', contact: 'Arun Kumar', phone: '+91 98400 77052' },
  { id: 13, code: 'HOS-01', name: 'Hosur Plant', location: 'SIPCOT', state: 'Tamil Nadu', capacity: 12000, output: 11470, status: 'On target', contact: 'Suresh Babu', phone: '+91 98400 77053' },
  { id: 14, code: 'NOI-01', name: 'Noida Plant', location: 'Sector 63', state: 'Uttar Pradesh', capacity: 10500, output: 8860, status: 'Behind', contact: 'Amit Sharma', phone: '+91 98100 88054' },
  { id: 15, code: 'JPR-01', name: 'Jaipur Plant', location: 'Sitapura', state: 'Rajasthan', capacity: 10500, output: 10090, status: 'On target', contact: 'Lokesh Meena', phone: '+91 98290 99055' },
];

const CORE_ARTICLES: Article[] = [
  { id: 1, code: 'SIP-SDZ-FSC-01', modelName: 'Front Seat Cover — Swift Dzire', segment: 'Passenger', coverType: 'Front bucket set', material: 'Knitted polyester', unitCost: 1320, unitPrice: 1880, plantIds: [1, 2, 9], barcode: '8904123001018', active: true },
  { id: 2, code: 'SIP-BOL-RBT-02', modelName: 'Rear Bench Trim — Bolero', segment: 'Utility', coverType: 'Rear bench', material: 'Woven fabric + PVC', unitCost: 1480, unitPrice: 2160, plantIds: [3, 7, 8], barcode: '8904123001025', active: true },
  { id: 3, code: 'SIP-CRE-FSC-03', modelName: 'Front Seat Cover — Creta', segment: 'Passenger', coverType: 'Front bucket set', material: 'Perforated PU', unitCost: 2250, unitPrice: 3180, plantIds: [1, 11, 12], barcode: '8904123001032', active: true },
  { id: 4, code: 'SIP-NEX-CST-04', modelName: 'Complete Seat Trim — Nexon', segment: 'Passenger', coverType: 'Complete 5-seat set', material: 'Premium woven fabric', unitCost: 3980, unitPrice: 5540, plantIds: [4, 5, 9], barcode: '8904123001049', active: true },
  { id: 5, code: 'SIP-THR-FSC-05', modelName: 'Front Seat Cover — Thar', segment: 'Utility', coverType: 'Front bucket set', material: 'Water-resistant vinyl', unitCost: 1980, unitPrice: 2860, plantIds: [3, 6, 7], barcode: '8904123001056', active: true },
  { id: 6, code: 'SIP-ACE-DRT-06', modelName: 'Driver Seat Trim — Tata Ace', segment: 'Commercial', coverType: 'Driver seat', material: 'Heavy-duty textile', unitCost: 860, unitPrice: 1240, plantIds: [8, 14], barcode: '8904123001063', active: true },
  { id: 7, code: 'SIP-ERT-CST-07', modelName: 'Complete Seat Trim — Ertiga', segment: 'Passenger', coverType: 'Complete 7-seat set', material: 'Knitted polyester', unitCost: 4860, unitPrice: 6720, plantIds: [2, 9, 13], barcode: '8904123001070', active: true },
  { id: 8, code: 'SIP-XUV-RBT-08', modelName: 'Rear Bench Trim — XUV700', segment: 'Utility', coverType: '60:40 split bench', material: 'PU + suede composite', unitCost: 2860, unitPrice: 3970, plantIds: [4, 6, 11], barcode: '8904123001087', active: true },
  { id: 9, code: 'SIP-ALZ-HRT-09', modelName: 'Headrest Trim — Alcazar', segment: 'Passenger', coverType: 'Headrest set', material: 'Perforated PU', unitCost: 620, unitPrice: 910, plantIds: [12, 13], barcode: '8904123001094', active: true },
  { id: 10, code: 'SIP-DOS-CBT-10', modelName: 'Cabin Seat Trim — Dost', segment: 'Commercial', coverType: 'Cabin bench set', material: 'Heavy-duty vinyl', unitCost: 1560, unitPrice: 2240, plantIds: [10, 15], barcode: '8904123001100', active: true },
  { id: 11, code: 'SIP-BRE-CST-11', modelName: 'Complete Seat Trim — Brezza', segment: 'Passenger', coverType: 'Complete 5-seat set', material: 'Woven jacquard', unitCost: 3720, unitPrice: 5180, plantIds: [1, 2, 9], barcode: '8904123001117', active: true },
  { id: 12, code: 'SIP-TRV-DRT-12', modelName: 'Driver Seat Trim — Traveller', segment: 'Commercial', coverType: 'Driver seat', material: 'Anti-static textile', unitCost: 1050, unitPrice: 1490, plantIds: [4, 5], barcode: '8904123001124', active: false },
];

export const INITIAL_ARTICLES: Article[] = [
  ...CORE_ARTICLES,
  ...Array.from({ length: 288 }, (_, index): Article => {
    const id = CORE_ARTICLES.length + index + 1;
    const base = CORE_ARTICLES[index % CORE_ARTICLES.length];
    return {
      ...base,
      id,
      code: `SIP-VAR-${String(id).padStart(4, '0')}`,
      modelName: `${base.modelName.split(' — ')[0]} — Variant ${String(id).padStart(3, '0')}`,
      unitCost: base.unitCost + (index % 9) * 35,
      unitPrice: base.unitPrice + (index % 11) * 55,
      barcode: `8904123${String(id).padStart(6, '0')}`,
      active: id % 17 !== 0,
    };
  }),
];

const CORE_CUSTOMERS: Customer[] = [
  { id: 1, name: 'Maruti Suzuki India', code: 'MSIL', gstin: '06AAACM0829Q1ZK', contact: 'Ankit Malhotra', phone: '+91 98101 34120', city: 'Gurgaon', creditDays: 45, status: 'Active' },
  { id: 2, name: 'Mahindra & Mahindra', code: 'M&M', gstin: '27AAACM3025E1ZZ', contact: 'Prasad Kulkarni', phone: '+91 98220 43121', city: 'Mumbai', creditDays: 60, status: 'Active' },
  { id: 3, name: 'Hyundai Motor India', code: 'HMIL', gstin: '33AAACH2364M1ZP', contact: 'Sanjay Krishnan', phone: '+91 98400 53122', city: 'Chennai', creditDays: 45, status: 'Active' },
  { id: 4, name: 'Tata Motors', code: 'TML', gstin: '27AAACT2727Q1ZW', contact: 'Rohit Deshpande', phone: '+91 98220 63123', city: 'Pune', creditDays: 60, status: 'Active' },
  { id: 5, name: 'Ashok Leyland', code: 'ALL', gstin: '33AAACA4651L1ZS', contact: 'Naveen Iyer', phone: '+91 98400 73124', city: 'Chennai', creditDays: 30, status: 'On hold' },
  { id: 6, name: 'Force Motors', code: 'FML', gstin: '27AAACB5060C1Z9', contact: 'Mehul Joshi', phone: '+91 98220 83125', city: 'Pune', creditDays: 45, status: 'Active' },
];

const cities = ['Gurgaon', 'Pune', 'Chennai', 'Bengaluru', 'Ahmedabad', 'Noida', 'Nashik', 'Jaipur'];
export const INITIAL_CUSTOMERS: Customer[] = [
  ...CORE_CUSTOMERS,
  ...Array.from({ length: 494 }, (_, index): Customer => {
    const id = CORE_CUSTOMERS.length + index + 1;
    const phone = String(7000000000 + id * 7919).padStart(10, '0').slice(-10);
    return {
      id,
      name: `OEM Partner ${String(id).padStart(3, '0')}`,
      code: `OEM${String(id).padStart(3, '0')}`,
      gstin: `06AABCO${String(id).padStart(4, '0')}K1Z${id % 10}`,
      contact: `Account Manager ${String(id).padStart(3, '0')}`,
      phone: `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`,
      city: cities[index % cities.length],
      creditDays: [30, 45, 60, 90][index % 4],
      status: id % 17 === 0 ? 'On hold' : 'Active',
    };
  }),
];

const SCAN_COUNT = 15000;
export const INITIAL_SCANS: ScanRecord[] = Array.from({ length: SCAN_COUNT }, (_, index) => {
  const article = INITIAL_ARTICLES[(index * 17) % INITIAL_ARTICLES.length];
  return {
    id: 500000 + index,
    timestamp: historyDate(index, SCAN_COUNT),
    plantId: article.plantIds[index % article.plantIds.length],
    articleId: article.id,
    articleCode: article.code,
    articleName: article.modelName,
    barcode: article.barcode,
    source: index % 5 === 0 ? 'Manual' : 'Camera',
    syncStatus: index < 24 && index % 8 === 0 ? 'Pending' : 'Synced',
  };
});

const ledgerStatuses: LedgerEntry['status'][] = ['Delivered', 'In transit', 'Ready'];
const LEDGER_COUNT = 12000;
export const INITIAL_LEDGER: LedgerEntry[] = Array.from({ length: LEDGER_COUNT }, (_, index) => {
  const article = INITIAL_ARTICLES[(index * 11) % INITIAL_ARTICLES.length];
  const customer = INITIAL_CUSTOMERS[(index * 13) % INITIAL_CUSTOMERS.length];
  const date = historyDate(index, LEDGER_COUNT);
  const year = String(date.getFullYear()).slice(-2);
  return {
    id: 600000 + index,
    date: isoDate(date),
    plantId: article.plantIds[index % article.plantIds.length],
    articleId: article.id,
    customer: customer.name,
    quantity: 40 + ((index * 37) % 620),
    rate: article.unitPrice + (index % 7) * 15,
    status: ledgerStatuses[index % ledgerStatuses.length],
    invoice: index % 11 === 0 ? 'Pending' : `SIP/${year}-${String(Number(year) + 1).padStart(2, '0')}/${String(12000 + index)}`,
  };
});

export const PRODUCTION_ROWS: ProductionRow[] = INITIAL_PLANTS.map((plant, index) => ({
  plantId: plant.id,
  target: Math.round(plant.capacity * 0.96),
  actual: plant.output,
  rejected: 22 + ((index * 11) % 74),
}));

const orderStatuses: Order['status'][] = ['Draft', 'Confirmed', 'In Production', 'Dispatched', 'Invoiced'];
const ORDER_COUNT = 8000;
export const INITIAL_ORDERS: Order[] = Array.from({ length: ORDER_COUNT }, (_, index) => {
  const article = INITIAL_ARTICLES[(index * 19) % INITIAL_ARTICLES.length];
  const customer = INITIAL_CUSTOMERS[(index * 7) % INITIAL_CUSTOMERS.length];
  const dueDate = historyDate(index, ORDER_COUNT);
  return {
    id: 700000 + index,
    poNumber: `PO/${customer.code.replaceAll('&', '')}/${String(dueDate.getFullYear()).slice(-2)}/${String(10000 + index)}`,
    customerId: customer.id,
    articleId: article.id,
    plantId: article.plantIds[index % article.plantIds.length],
    quantity: 100 + ((index * 175) % 4800),
    rate: article.unitPrice + (index % 5) * 25,
    dueDate: isoDate(dueDate),
    status: orderStatuses[index % orderStatuses.length],
  };
});

const INVENTORY_COUNT = 2500;
export const INITIAL_INVENTORY: InventoryItem[] = Array.from({ length: INVENTORY_COUNT }, (_, index) => {
  const article = INITIAL_ARTICLES[(index * 23) % INITIAL_ARTICLES.length];
  const reorderLevel = 180 + (index % 6) * 55;
  return {
    id: 800000 + index,
    plantId: article.plantIds[index % article.plantIds.length],
    articleId: article.id,
    quantity: 80 + ((index * 83) % 1450),
    reorderLevel,
    ageDays: 1 + ((index * 7) % 365),
    updatedAt: isoDate(historyDate(index, INVENTORY_COUNT)),
  };
});

const CORE_USERS: AppUser[] = [
  { id: 1, name: 'Aditya Mehra', email: 'aditya.mehra@siinterpack.in', role: 'Corporate Admin', plantId: null, employeeCode: 'SIP-COR-004', status: 'Active' },
  { id: 2, name: 'Rakesh Yadav', email: 'rakesh.yadav@siinterpack.in', role: 'Plant Operator', plantId: 1, employeeCode: 'SIP-GGN-042', status: 'Active' },
  { id: 3, name: 'Sunita Kumari', email: 'sunita.kumari@siinterpack.in', role: 'Plant Operator', plantId: 3, employeeCode: 'SIP-MNS-018', status: 'Active' },
  { id: 4, name: 'Nidhi Mehta', email: 'nidhi.mehta@siinterpack.in', role: 'Sales', plantId: null, employeeCode: 'SIP-SAL-011', status: 'Active' },
  { id: 5, name: 'Ashish Rao', email: 'ashish.rao@siinterpack.in', role: 'Plant Operator', plantId: 11, employeeCode: 'SIP-BLR-027', status: 'Suspended' },
];

const USER_COUNT = 750;
export const INITIAL_USERS: AppUser[] = [
  ...CORE_USERS,
  ...Array.from({ length: USER_COUNT - CORE_USERS.length }, (_, index): AppUser => {
    const id = CORE_USERS.length + index + 1;
    const role: AppUser['role'] = id % 7 === 0 ? 'Corporate Admin' : id % 5 === 0 ? 'Sales' : 'Plant Operator';
    return {
      id,
      name: `SI Employee ${String(id).padStart(4, '0')}`,
      email: `employee.${String(id).padStart(4, '0')}@siinterpack.in`,
      role,
      plantId: role === 'Plant Operator' ? (index % INITIAL_PLANTS.length) + 1 : null,
      employeeCode: `SIP-${role === 'Corporate Admin' ? 'COR' : role === 'Sales' ? 'SAL' : INITIAL_PLANTS[index % INITIAL_PLANTS.length].code.split('-')[0]}-${String(id).padStart(4, '0')}`,
      status: id % 29 === 0 ? 'Suspended' : 'Active',
    };
  }),
];
