import { createWriteStream, existsSync, mkdir, WriteStream } from 'fs';
import { createInterface } from 'readline';
import { Builder, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import 'chromedriver';

export function createDirectory(): void {
  if (!existsSync('./reports')) {
    mkdir('./reports', (err) => {
      if (err) {
        return console.error(err);
      }
    });
  }
}

function question(prompt:string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let response:string;

  rl.setPrompt(prompt);
  rl.prompt();

  return new Promise<string>((resolve) => {
    rl.on('line', (userInput) => {
      response = userInput;
      rl.close();
    });

    rl.on('close', () => {
      resolve(response);
    });
  });
}

export async function getDate(): Promise<string> {
  return await question("Enter the date for the report (formats: yyyy-mm-dd) or nothing for today: ") || new Date().toISOString().slice(0, 10);
}

export async function getDriver(): Promise<WebDriver> {
  return await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().headless())
    .build();
}

export function createReportTxt(date: string): WriteStream {
  return createWriteStream(`./reports/Raport ${process.env.name} ${date}.txt`, {
    flags: 'w',
  });
}

export function convertTo24HourTime(date: string[]): string {
  let meridian = date[1];
  if (meridian === 'pm' && !date[0].startsWith('12')) {
    date[0] = date[0].replace(/\d+:\d+/, (hoursMinutes) => {
      let [hours, minutes] = hoursMinutes.split(':');
      return `${parseInt(hours) + 12}:${minutes}`;
    });
  }
  return date[0];
}
