require('./conf/logging');

import * as cron from 'node-cron';
import * as log from 'winston';

import * as wattiMaatti from './plugins/wattimaatti/plugin';

// Schedule to be run every hour
cron.schedule('0 * * * *', async () => {
  log.debug('Start the scheduled WattiMaatti fetch');
  await wattiMaatti.apply();
  log.debug('Finished running the scheduled WattiMaatti fetch');
});

// Run once right after start
wattiMaatti.apply();
