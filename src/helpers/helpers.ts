import { WriteStream, } from 'fs';
import { readdir } from 'fs/promises';
import { By, Key, WebDriver, until } from 'selenium-webdriver';
import { convertTo24HourTime } from '../utils/utils';

export async function login(driver: WebDriver): Promise<void> {
  await driver.get('https://app.hubstaff.com/login');

  await driver
    .findElement(By.xpath('//*[@id="user_email"]'))
    .sendKeys(`${process.env.email}`);

  await driver
    .findElement(By.xpath('//*[@id="user_password"]'))
    .sendKeys(`${process.env.password}`, Key.ENTER);
}

async function countLines(driver: WebDriver): Promise<number> {
  const lines: WebDriver[] = await driver.executeScript(
    "return document.querySelectorAll('.report-table-virtual-list > div > div')"
  );
  return lines.length;
}

export async function writeReportBody(
  driver: WebDriver,
  logStream: WriteStream
): Promise<void> {
  const exportBtn = await driver.findElement(By.css('.dropdown.open'));
  const dropdown = await exportBtn.findElement(By.css('.dropdown-menu'));
  const buttonToClick = await dropdown.findElement(By.css('li:nth-of-type(2)'));
  await buttonToClick.click();

  await driver.sleep(500);

  await driver.findElement(By.css('.custom-checkbox-wrapper.my-5.mx-0:nth-of-type(2)')).click();
  await driver.sleep(500);
  await driver.findElement(By.css('.justify-content-end > .btn.btn-primary')).click();

  // now the file is downloading

  await driver.sleep(1000);

  // how do I get the file

  readdir('~/Downloads').then((files) => {
    console.log(files);
  });
  
}

export function writeReportHeader(logStream: WriteStream): void {
  logStream.write('Raportul pentru azi:\n\n');
}

export async function getTotalHours(
  driver: WebDriver,
  id: string,
  date: string
): Promise<string | null> {
  await driver.get(
    `https://app.hubstaff.com/reports/${id}/my/time_and_activities?date=${date}&date_end=${date}`
  );
  try {
    const noData = await driver.wait(
      until.elementLocated(
        By.css('.report-no-data')
      ),
      1000
    );
    if (noData) return null;
  } catch(e) {
    // this is intentional
  }

  return await driver
    .wait(
      until.elementLocated(
        By.css(`tbody.ttotal:nth-child(3) > tr:nth-child(1) > td:nth-child(3)`)
      ),
      1000
    )
    .getText();
}

export async function writeReportFooter(
  driver: WebDriver,
  logStream: WriteStream,
  id: string,
  date: string,
  totalHours: string
): Promise<void> {
  await driver.get(
    `https://app.hubstaff.com/organizations/${id}/time_entries/daily?date=${date}&date_end=${date}`
  );

  let inTime: string | string[] = await driver
    .wait(
      until.elementLocated(
        By.css(`tr.vue-time-entries-row:nth-child(1) > td:nth-child(8)`)
      ),
      10000
    )
    .getText();
  inTime = inTime.match(/\d+:\d+ am|\d+:\d+ pm/gm)![0].split(' ');
  inTime[0] = convertTo24HourTime(inTime);

  let index = 2;
  let outTime: string | string[];
  while (true) {
    try {
      await driver
        .findElement(
          By.css(
            `tr.vue-time-entries-row:nth-child(${index}) > td:nth-child(8)`
          )
        )
        .getText();
      index++;
    } catch (e) {
      outTime = await driver
        .findElement(
          By.css(
            `tr.vue-time-entries-row:nth-child(${index - 1}) > td:nth-child(8)`
          )
        )
        .getText();
      outTime = outTime.match(/\d+:\d+ am|\d+:\d+ pm/gm)![1].split(' ');
      outTime[0] = convertTo24HourTime(outTime);
      break;
    }
  }

  logStream.write(
    `\nIn: ${inTime[0]} Out: ${outTime[0]} Work Time: ${
      totalHours.length === 8 ? totalHours.slice(0, 5) : totalHours.slice(0, 4)
    }\n`
  );

  logStream.end(
    '\n\nCreated with https://github.com/snaake20/get_hubstaff_report'
  );
}
