import { DateTime } from 'luxon';

export interface EnergyMeasurement {
  readonly timestamp: DateTime;
  readonly energyConsumption: number;
}
