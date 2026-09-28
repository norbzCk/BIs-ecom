export interface AccountShipment {
  id: string;
  orderCode: string;
  status: 'SHIPPED' | 'DELIVERED';
  placedOn: string;
  summary: string;
  total: number;
}

export const currentAccount = {
  firstName: 'Sarah',
  lastName: 'Mitchell',
  customerId: 'NB-MITCH-62',
  tier: 'Professional',
  tierPoints: 4800,
  tierNote: '$68.00 store credit available',
  primaryAddress: {
    label: 'Primary Workstation Destination',
    name: 'Sarah Mitchell (ArchTech Labs)',
    street: '1044 Tech Park Parkway, Suite 400',
    cityLine: 'Austin, TX 78701',
  },
  payment: {
    label: 'Authorized Business Payments',
    cardBrand: 'Visa',
    last4: '4812',
    expiry: '08 / 29',
  },
};

export const accountShipments: AccountShipment[] = [
  {
    id: 's1',
    orderCode: 'NB-92841-X',
    status: 'SHIPPED',
    placedOn: 'Oct 24, 2026',
    summary: 'Apex-15 Pro Workstation + BillionareGlide X Wireless Mouse',
    total: 1920,
  },
  {
    id: 's2',
    orderCode: 'NB-84201-M',
    status: 'DELIVERED',
    placedOn: 'Aug 12, 2026',
    summary: 'BillionareView 34" UltraWide Curved Monitor (3440 x 1440)',
    total: 549,
  },
];
