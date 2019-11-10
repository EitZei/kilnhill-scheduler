import * as log from 'winston';

import { DateTime, Duration } from 'luxon';

import influxProvider from '../../conf/influxdb';

import * as tokenFetcher from './token-fetcher';
import * as consumptionFetcher from './consumption-fetcher';

const measurementsName = 'energyConsumption';

const influx = influxProvider(measurementsName);

export async function apply() {
  const now = DateTime.local();
  const monthFromNow = now.minus(Duration.fromObject({ days: 30 }));

  const jwtToken = await tokenFetcher.getJwtToken();

  const energyMeasurements = await consumptionFetcher.fetchEnergyMeasurements(jwtToken, monthFromNow, now);

  const influxMeasurements = energyMeasurements.map(energyMeasurement => ({
    measurement: measurementsName,
    tags: {
      source: 'TampereElectricity'
    },
    fields: {
      energyConsumption: energyMeasurement.energyConsumption,
    },
    timestamp: energyMeasurement.timestamp.toJSDate(),
  }));

  try {
    await influx.writePoints(influxMeasurements, { precision: 'h' })
    log.debug(`Successfully wrote ${influxMeasurements.length} items to InfluxDB.`);
  } catch (e) {
    log.error(`Error in writing data to InfluxDB. ${e}`);
  }
};
