import * as log from 'winston';

import { DateTime, Duration } from 'luxon';

import influxProvider from '../../conf/influxdb';

import * as fetcher from './fetcher';

const measurementsName = 'energyConsumption';

const influx = influxProvider(measurementsName);

export async function apply() {
  const now = DateTime.local();
  const weekFromNow = now.minus(Duration.fromObject({ days: 7 }));

  const energyMeasurements = await fetcher.fetchEnergyMeasurements(weekFromNow, now);

  const influxMeasurements = energyMeasurements.map(energyMeasurement => ({
    measurement: measurementsName,
    tags: {
      source: 'WattiMaatti'
    },
    fields: {
      energyConsumption: energyMeasurement.energyConsumption,
      temperature: energyMeasurement.energyConsumption
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
