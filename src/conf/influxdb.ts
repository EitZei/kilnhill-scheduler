import * as log from 'winston';
import * as Influx from 'influx';

let influxProvider = null;

if (process.env.MOCK_INFLUXDB) {
  influxProvider = measurementsName => ({
    ping: () => Promise.resolve([{
      online: true,
      url: {
        host: 'mock',
      },
      rtt: 1000,
      version: '1.0.0',
    }]),
    writePoints: (data) => {
      log.debug(`Write to DB [${measurementsName}]:`);
      log.debug(JSON.stringify(data, null, 4));
      return Promise.resolve();
    },
  });
} else {
  influxProvider = measurementsName => new Influx.InfluxDB({
    host: process.env.INFLUXDB_HOST,
    database: process.env.INFLUXDB_DATABASE,
    username: process.env.INFLUXDB_USERNAME,
    password: process.env.INFLUXDB_PASSWORD,
    schema: [{
      measurement: measurementsName,
      fields: {
        energyConsumption: Influx.FieldType.FLOAT,
        temperature: Influx.FieldType.FLOAT,
      },
      tags: [
        'source'
      ],
    }],
  });
}

export default (measurementsName): Influx.InfluxDB => influxProvider(measurementsName);
