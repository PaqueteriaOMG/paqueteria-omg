export interface Package {
  id: string;
  tracking_number: string;
  sender_name: string;
  sender_email: string;
  sender_phone: string;
  sender_address: string;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  recipient_address: string;
  weight: number;
  dimensions: string;
  description: string;
  quantity: number;
  status: PackageStatus;
  created_at: string;
  updated_at: string;
  estimated_delivery: string;
  actual_delivery?: string;
  notes?: string;
}



export interface ClientGroup {
  client_name: string;
  client_email: string;
  client_address: string;
  delivery_date: string;
  packages: Package[];
  total_packages: number;
  total_products: number;
}

export enum PackageStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  RETURNED = 'returned'
}

export interface PackageStats {
  total: number;
  pending: number;
  in_transit: number;
  delivered: number;
  returned: number;
}

export interface CreatePackageRequest {
  sender_name: string;
  sender_email: string;
  sender_phone: string;
  sender_address: string;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  recipient_address: string;
  weight: number;
  dimensions: string;
  description: string;
  quantity: number;
  estimated_delivery: string;
  notes?: string;
}