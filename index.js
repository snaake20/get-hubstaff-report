const fs = require('fs');
const path = require('path');
const {By, Key, Builder, until} = require("selenium-webdriver");
require("chromedriver");
const readline = require('readline');
require('dotenv').config()

async function getDailyReport(date) {
  if (!fs.existsSync('./reports')) {
    fs.mkdir(path.join(__dirname, 'reports'), (err) => {
      if (err) {
        return console.error(err);
      }
    });
  }

  const logStream = fs.createWriteStream(`reports/Raport ${process.env.name} ${date}.txt`, {flags: 'w'});
  logStream.write('Raportul pentru azi:\n');


  let driver = await new Builder().forBrowser("chrome").build();
  driver = driver.setChromeOptions(new chrome.Options().headless())

  await driver.get("https://app.hubstaff.com/login");

  await driver.findElement(By.xpath('//*[@id="user_email"]')).sendKeys(`${process.env.email}`);

  await driver.findElement(By.xpath('//*[@id="user_password"]')).sendKeys(`${process.env.password}`, Key.ENTER);

  const link = await driver.getCurrentUrl()
  const id = link.match(/\d+/)

  await driver.get(`https://app.hubstaff.com/reports/${id}/my/time_and_activities?date=${date}&date_end=${date}`)

  let totalHours = await driver.wait(until.elementLocated(By.css(`tbody.ttotal:nth-child(3) > tr:nth-child(1) > td:nth-child(3)`)), 10000).getText()

  let project
  let task

  for (let index = 1; ; index++) {
    try {
      project = await driver.findElement(By.css(`.tbody > tr:nth-child(${index}) > td:nth-child(1)`)).getText().then(r => r.slice(2).trim())
      task = ''
    } catch (e) {
      break;
    }
    if (project === '') {
      task = await driver.findElement(By.css(`.tbody > tr:nth-child(${index}) > td:nth-child(2)`)).getText()
    }
    let time = await driver.findElement(By.css(`.tbody > tr:nth-child(${index}) > td:nth-child(3)`)).getText()
    logStream.write(`\t\t${project || '\t\t'}${task || ''} ${time.slice(0,4)}\n`);
  }
  logStream.write(`\nIn:  Out:  Work Time: ${totalHours.length === 8 ? totalHours.slice(0,5) : totalHours.slice(0,4)}\n`);
  logStream.end("\nCreated with https://github.com/snaake20/get_hubstaff_report \n");

  await driver.quit();
}

(async () => {
  const rl = readline.createInterface({
    input: process.stdin, output: process.stdout
  });
  await new Promise(res => {
    rl.question('Enter the date for the report (formats: yyyy-mm-dd) ', res)
  }).then((res) => {
    getDailyReport(res).then(() => process.exit())
  })
})();
