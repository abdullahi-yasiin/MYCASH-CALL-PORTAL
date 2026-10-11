import { User, BranchInfo, CustomerRecord, ActivityLog } from '../types';

export const INITIAL_BRANCHES: BranchInfo[] = [
  { id: 'b-glk-n', name: 'Galkacyo North Branch', region: 'Mudug', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 800 },
  { id: 'b-glk-s', name: 'Galkacyo South Branch', region: 'Mudug', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 750 },
  { id: 'b-brt', name: 'Burtinle Branch', region: 'Nugaal', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 600 },
  { id: 'b-grw', name: 'Garowe Branch', region: 'Nugaal', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 950 },
  { id: 'b-las', name: 'Laascanood Branch', region: 'Sool', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 700 },
  { id: 'b-qrd', name: 'Qardho Branch', region: 'Karkaar', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 650 },
  { id: 'b-crm', name: 'Carmo Branch', region: 'Bari', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 550 },
  { id: 'b-dhh', name: 'Dhahar Branch', region: 'Sanaag', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 500 },
  { id: 'b-brn', name: 'Baran Branch', region: 'Sanaag', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 500 },
  { id: 'b-bos', name: 'Bosaso Branch', region: 'Bari', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 900 },
  { id: 'b-cbd', name: 'Cabudwaaq Branch', region: 'Galguduud', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 600 },
  { id: 'b-dhs', name: 'Dhuusamareeb Branch', region: 'Galguduud', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 650 },
  { id: 'b-bdw', name: 'Baledweyne Branch', region: 'Hiraan', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 850 },
  { id: 'b-byd', name: 'Baydhabo Branch', region: 'Bay', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 850 },
  { id: 'b-ksm', name: 'Kismaayo Branch', region: 'Lower Juba', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 800 },
  { id: 'b-dll', name: 'Dollow Branch', region: 'Gedo', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 550 },
  { id: 'b-brd', name: 'Baardheere Branch', region: 'Gedo', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 600 },
  { id: 'b-blx', name: 'Baledxaawo Branch', region: 'Gedo', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 550 },
  { id: 'b-jwh', name: 'Jowhar Branch', region: 'Middle Shabelle', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 700 },
  { id: 'b-mgd', name: 'Mogadishu Branch', region: 'Banadir', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 1500 },
  { id: 'b-hrg', name: 'Hargeisa Branch', region: 'Maroodi Jeex', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 1200 },
  { id: 'b-brm', name: 'Borama Branch', region: 'Awdal', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 750 },
  { id: 'b-brb', name: 'Berbera Branch', region: 'Sahil', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 700 },
  { id: 'b-brc', name: 'Burco Branch', region: 'Togdheer', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 850 },
  { id: 'b-bhd', name: 'Buuhoodle Branch', region: 'Togdheer', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 650 },
  { id: 'b-wjl', name: 'Wajaale Branch', region: 'Maroodi Jeex', supervisorId: '', supervisorName: 'Unassigned', targetCallsMonth: 600 }
];

export const INITIAL_USERS: User[] = [
  // HQ Admin (Only default system user)
  {
    id: 'u-admin-1',
    name: 'Abdullahi Yasin',
    email: 'cabdallahyasiin@gmail.com',
    role: 'HQ_ADMIN',
    branch: 'Headquarters',
    active: true,
    phone: '+252710000255',
    password: 'amal123'
  }
];

export const INITIAL_CUSTOMERS: CustomerRecord[] = [];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];
