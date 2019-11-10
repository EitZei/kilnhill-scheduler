require('./conf/logging');

import * as cron from 'node-cron';
import * as log from 'winston';

import * as treElectricity from './plugins/tampere-electricity/plugin';

// Schedule to be run every hour
cron.schedule('0 * * * *', async () => {
  log.debug('Start the scheduled Tampere electricity fetch');
  await treElectricity.apply();
  log.debug('Finished running the scheduled Tampere electricity fetch');
});

// Run once right after start
treElectricity.apply();
