import * as puppeteer from 'puppeteer';
import * as log from 'winston';
import { DateTime } from 'luxon';

import { EnergyMeasurement } from './types';

interface RawEnergyMeasurement {
  timestamp?: string;
  energyConsumption?: string;
  temperature?: string;
}

const timezone = 'Europe/Helsinki';
const inputDateTimeFormat = 'ddLLy';
const outputDateTimeFormat = 'd.L.y H:mm';

const DEBUG = (process.env.DEBUG) ? process.env.DEBUG === 'true' : false;

const selectors = {
  loginForm: {
    username: '#ctl00_ContentPlaceHolder1_Login1_Username',
    password: '#ctl00_ContentPlaceHolder1_Login1_Password',
    loginButton: '#ctl00_ContentPlaceHolder1_Login1_LoginButton',
  },
  mainPage: {
    confirmButton: '#ctl00_btnShow',
  },
  counterPage: {
    tableViewButton: '#ctl00_ContentPlaceHolder1_ActiveIcon2',
    choosePeriodButton: '#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderChild1_lbChoosePeriod',
    startDate: '#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderChild1_tbxBeginDate',
    endDate: '#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderChild1_tbxEndDate',
    periodDropdown: '#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderChild1_ddlResolution_arrow',
    hour: '#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderChild1_ddlResolution_msa_3',
    search: '#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderChild1_btnSearch',
    resultTableRows: '#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderChild1_gvTimeSeries_DXMainTable > tbody > tr',
  }
};

export async function fetchEnergyMeasurements(startDate: DateTime, endDate: DateTime): Promise<Array<EnergyMeasurement>> {
  log.debug(`Start fetching energy measurements from WattiMaatti for period from ${startDate} to ${endDate}`);

  const browser = await puppeteer.launch({
    headless: !DEBUG,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  await page.goto('https://wattimaatti.fi');

  log.debug(`Login to Wattimaatti`);
  await page.waitForSelector(selectors.loginForm.username);
  await page.type(selectors.loginForm.username, process.env.WATTIMAATTI_USERNAME);
  await page.type(selectors.loginForm.password, process.env.WATTIMAATTI_PASSWORD);
  await page.click(selectors.loginForm.loginButton);

  await page.waitForSelector(selectors.mainPage.confirmButton);

  if (await page.$(selectors.mainPage.confirmButton) !== null) {
    log.debug(`Close the dialog on the front page`);
    await page.click(selectors.mainPage.confirmButton);
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
  }

  log.debug(`Navigate to consumption report`);
  await page.goto('https://wattimaatti.fi/ConsumptionReporting/ConsumptionReport.aspx');

  log.debug(`Navigate to table view`);
  await page.click(selectors.counterPage.tableViewButton);
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  log.debug(`Navigate to choosing the period for the report`);
  await page.click(selectors.counterPage.choosePeriodButton);
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  log.debug(`Input start and end date set accuracy to hour`);
  await page.focus(selectors.counterPage.startDate);
  await page.type(selectors.counterPage.startDate, startDate.toFormat(inputDateTimeFormat))
  await page.focus(selectors.counterPage.endDate);
  await page.type(selectors.counterPage.endDate, endDate.toFormat(inputDateTimeFormat))

  await page.click(selectors.counterPage.periodDropdown);
  await page.waitForSelector(selectors.counterPage.hour);
  await page.click(selectors.counterPage.hour);

  log.debug('Do the search for the report');
  await page.click(selectors.counterPage.search);
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // Do note that eval is executed in the browser context!
  const rawData: Array<RawEnergyMeasurement> = await page.$$eval(selectors.counterPage.resultTableRows, (rows) => {
    const measurements: Array<RawEnergyMeasurement> = [];

    rows.splice(1, rows.length).forEach((row) => {
      const columns = row.childNodes;

      const measurement: RawEnergyMeasurement = {};
      for (let i = 0; i < columns.length; i++) {
        const column = columns.item(i);

        let key;
        switch (i) {
          case 1:
            key = 'timestamp';
            break;
          case 2:
            key = 'energyConsumption';
            break;
          case 4:
            key = 'temperature';
            break;
        }

        if (key) {
          measurement[key] = column.textContent;
        }
      }

      measurements.push(measurement);
    });

    return measurements;
  })

  log.debug('Close the browser');
  await browser.close();

  log.debug('Transform the data to the correct format');
  const result: Array<EnergyMeasurement> = rawData
    .filter(rawDataItem =>
      rawDataItem.timestamp !== undefined && rawDataItem.energyConsumption !== undefined && rawDataItem !== undefined
    )
    .map((rawDataItem) => {
      const timestamp = DateTime.fromFormat(rawDataItem.timestamp, outputDateTimeFormat, { zone: timezone });
      const energyConsumption = parseFloat(rawDataItem.energyConsumption.replace(',', '.'));
      const temperature = parseFloat(rawDataItem.temperature.replace(',', '.'));

      return {
        timestamp,
        energyConsumption,
        temperature
      };
    });

  return result;
};
