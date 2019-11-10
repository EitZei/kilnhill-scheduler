import * as puppeteer from 'puppeteer';
import * as log from 'winston';

const DEBUG = (process.env.DEBUG) ? process.env.DEBUG === 'true' : false;

const selectors = {
  loginForm: {
    username: '.loginitem #username',
    password: '.loginitem #password',
    loginButton: '.loginitem .loginbutton input',
  },
  mainPage: {
    invoice_status: '.invoice-widget__status',
  },
};

export async function getJwtToken(): Promise<String> {
  log.debug(`Start fetching JWT from Tampere Electricity customer portal`);

  log.debug(`Launch ${DEBUG ? '' : ' headless'}browser`);
  const browser = await puppeteer.launch({
    headless: !DEBUG,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  await page.goto('https://asiakas.sahkolaitos.fi');

  log.debug(`Start login`);
  await page.waitForSelector(selectors.loginForm.username);
  await page.type(selectors.loginForm.username, process.env.TAMPERE_ELECTRICITY_USERNAME);
  await page.type(selectors.loginForm.password, process.env.TAMPERE_ELECTRICITY_PASSWORD);
  await page.click(selectors.loginForm.loginButton);

  log.debug('Wait for app to load');
  await page.waitForSelector(selectors.mainPage.invoice_status);

  log.debug('Try to get JWT');
  const jwtToken = await page.evaluate(() => {
    return localStorage['jwt-token'];
  });

  if (!jwtToken) {
    throw new Error('Error fetching JWT token');
  }

  log.debug('Got JWT token');

  log.debug('Closing browser');
  await browser.close();

  return jwtToken;
};
