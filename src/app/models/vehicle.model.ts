export interface Vehicle {
  id: string;
  plate: string;
  lineName: string;
  status: VehicleStatus;
  latitude: number;
  longitude: number;
}

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  IN_SERVICE = 'IN_SERVICE',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE',
}
