import * as log from 'winston';
import { DateTime } from 'luxon';
import axios from 'axios';

import { EnergyMeasurement } from './types';

interface RawEnergyMeasurement {
  startTime?: string;
  endTime?: string;
  type?: string;
  value?: number;
}

export async function fetchEnergyMeasurements(jwtToken: String, startDate: DateTime, endDate: DateTime): Promise<Array<EnergyMeasurement>> {
  log.debug(`Start fetching energy measurements from Tampere Electricity for period from ${startDate} to ${endDate}`);

  const usagePlace = process.env.TAMPERE_ELECTRICITY_USAGE_PLACE;
  const customerId = process.env.TAMPERE_ELECTRICITY_CUSTOMER_ID;

  const baseUrl = 'https://asiakas.sahkolaitos.fi/api/v2/consumption/consumption/energy/';

  const url = `${baseUrl}/${usagePlace}?customerId=${customerId}&end=${encodeURIComponent(endDate.toISO())}&productId=TKS000&resolution=hour&start=${encodeURIComponent (startDate.toISO())}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${jwtToken}`
      },
    });

    const rawMeasurements: Array<RawEnergyMeasurement> = response.data.data.sumSeries.data;

    const result: Array<EnergyMeasurement> = rawMeasurements
    // Filter out zeros. In practice this only happens when there is no data.
    .filter(rawDataItem => rawDataItem.value !== 0)
    .map((rawDataItem) => {
      const timestamp = DateTime.fromISO(rawDataItem.endTime);
      const energyConsumption = rawDataItem.value;

      return {
        timestamp,
        energyConsumption,
      };
    });

    return result;
  } catch (error) {
      log.error(error);
      throw(error);
  }
};
