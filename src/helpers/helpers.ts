import { WriteStream } from 'fs';
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
  const noLines = await countLines(driver);

  for (let idx = 1; idx <= noLines; idx++) {
    try {
      let project = await driver
        .findElement(
          By.css(
            `.report-table-virtual-list > div > div:nth-of-type(${idx}) > div > table > .tbody > tr > td:nth-child(1)`
          )
        )
        .getText()
        .then((r) => r.slice(2).trim());
      let task = '';
      if (!project)
        task = await driver
          .findElement(
            By.css(
              `.report-table-virtual-list > div > div:nth-of-type(${idx}) > div > table > .tbody > tr > td:nth-child(2)`
            )
          )
          .getText();
      let time = await driver
        .findElement(
          By.css(
            `.report-table-virtual-list > div > div:nth-of-type(${idx}) > div > table > .tbody > tr > td:nth-child(3)`
          )
        )
        .getText();
      if (time.slice(0,4) !== '0:00')
        logStream.write(
          `${project ? '\t' + project : '\t\t'}${task || ''} ${time.slice(
            0,
            4
          )}\n`
        );
    } catch (e) {
      continue;
    }
  }
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
