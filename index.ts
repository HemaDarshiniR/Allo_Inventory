// types/index.ts
export interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  location: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

export interface ProductWithStock {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  stocks: WarehouseStock[];
}

export interface ReservationDetails {
  id: string;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  units: number;
  expiresAt: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    price: number;
    description: string;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}
