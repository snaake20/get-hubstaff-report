import {
  getTotalHours,
  login,
  writeReportBody,
  writeReportFooter,
  writeReportHeader,
} from './helpers/helpers';
import {
  createDirectory,
  createReportTxt,
  getDate,
  getDriver,
} from './utils/utils';

async function getDailyReport(date: string) {
  const driver = await getDriver();

  await login(driver);

  const link = await driver.getCurrentUrl();

  const id = RegExp(/\d+/).exec(link)![0];

  const totalHours = await getTotalHours(driver, id, date);

  if (!totalHours) return console.error('\nNo data for ' + date + '\n');

  const logStream = createReportTxt(date);

  writeReportHeader(logStream);

  await writeReportBody(driver, logStream);

  await writeReportFooter(driver, logStream, id, date, totalHours);

  await driver.quit();
}

(async () => {
  createDirectory();

  getDailyReport(await getDate()).then(() => process.exit());
})();
