const fs = require('fs');
const path = require('path');
const {By, Key, Builder, until} = require("selenium-webdriver");
require("chromedriver");
const chrome = require('selenium-webdriver/chrome')
const readline = require('readline');
require('dotenv').config()

function convertTo24HourTime(time) {
  let meridian = time[1]
  if (meridian === 'pm') {
    time[0] = time[0].replace(/\d+:\d+/, (hoursMinutes) => {
      let [hours, minutes] = hoursMinutes.split(':')
      hours = parseInt(hours) + 12
      return `${hours}:${minutes}`
    })
  }
  return time[0]
}

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


  const driver = await new Builder().forBrowser("chrome").setChromeOptions(new chrome.Options()).build();

  await driver.get("https://app.hubstaff.com/login");

  await driver.findElement(By.xpath('//*[@id="user_email"]')).sendKeys(`${process.env.email}`);

  await driver.findElement(By.xpath('//*[@id="user_password"]')).sendKeys(`${process.env.password}`, Key.ENTER);

  const link = await driver.getCurrentUrl()
  const id = link.match(/\d+/)

  await driver.get(`https://app.hubstaff.com/reports/${id}/my/time_and_activities?date=${date}&date_end=${date}`)

  let totalHours = await driver.wait(until.elementLocated(By.css(`tbody.ttotal:nth-child(3) > tr:nth-child(1) > td:nth-child(3)`)), 10000).getText()

  let project
  let task

  const lines = await driver.executeScript(' return document.querySelectorAll(\'.report-table-virtual-list > div > div\')');

  // outerLoop: for (let i=0;i<lines.length;i++) {
  //   let line = await lines[i];
  //   try {
  //     project =  await line.executeScript(` return document.querySelector('.report-table-virtual-list > div > div:nth-of-type(${id}) > div > table > .tbody > tr > td:nth-child(1)')`).getText().then(r => r.slice(2).trim());
  //     console.log(project)
  //     let time = await line.executeScript(` return document.querySelector('.report-table-virtual-list > div > div:nth-of-type(${id}) > div > table > .tbody > tr > td:nth-child(3)')`).getText();
  //     logStream.write(`${project || ''}${task || ''} ${time.slice(0,4)}\n`);
  //   } catch (e) {
  //     try {
  //       task =  await line.executeScript(` return document.querySelector('.report-table-virtual-list > div > div:nth-of-type(${id}) > div > table > .tbody > tr > td:nth-child(2)')`).getText().then(r => r.slice(2).trim());
  //       let time = await line.executeScript(` return document.querySelector('.report-table-virtual-list > div > div:nth-of-type(${id}) > div > table > .tbody > tr > td:nth-child(3)')`).getText();
  //       logStream.write(`${project || ''}${task || ''} ${time.slice(0,4)}\n`);
  //     } catch(e) {
  //       continue outerLoop;
  //     }
  //   }
  // };
  logStream.write('\n');
  for (let idx = 1; idx<= lines.length ; idx++) {
    try {
      project = await driver.findElement(By.css(`.report-table-virtual-list > div > div:nth-of-type(${idx}) > div > table > .tbody > tr > td:nth-child(1)`)).getText().then(r => r.slice(2).trim())
      if (!project) task = await driver.findElement(By.css(`.report-table-virtual-list > div > div:nth-of-type(${idx}) > div > table > .tbody > tr > td:nth-child(2)`)).getText()
      let time = await driver.findElement(By.css(`.report-table-virtual-list > div > div:nth-of-type(${idx}) > div > table > .tbody > tr > td:nth-child(3)`)).getText()
      console.log(project, time);
      logStream.write(`${project || '\t'}${task || ''} ${time.slice(0,4)}\n`);
    } catch (e) {
        continue;      
    }
  }

  await driver.get(`https://app.hubstaff.com/organizations/${id}/time_entries/daily?date=${date}&date_end=${date}`)

  let inTime = await driver.wait(until.elementLocated(By.css(`tr.vue-time-entries-row:nth-child(1) > td:nth-child(8)`)), 10000).getText()
  inTime = inTime.match(/\d+:\d+ am|\d+:\d+ pm/gm)[0].split(' ')
  inTime[0] = convertTo24HourTime(inTime)

  let index = 2;
  let outTime;
  while(true) {
    try {
      await driver.findElement(By.css(`tr.vue-time-entries-row:nth-child(${index}) > td:nth-child(8)`)).getText()
      index++;
    } catch (e) {
      outTime = await driver.findElement(By.css(`tr.vue-time-entries-row:nth-child(${index-1}) > td:nth-child(8)`)).getText()
      outTime = outTime.match(/\d+:\d+ am|\d+:\d+ pm/gm)[1].split(' ')
      outTime[0] = convertTo24HourTime(outTime)
      break;
    }
  }

  logStream.write(`\nIn: ${inTime[0]} Out: ${outTime[0]} Work Time: ${totalHours.length === 8 ? totalHours.slice(0,5) : totalHours.slice(0,4)}\n`);
  logStream.end("\n\nCreated with https://github.com/snaake20/get_hubstaff_report");


  await driver.quit();
}

(() => {
  const date = new Date().toISOString().slice(0, 10);
  getDailyReport(date).then(() => process.exit())
})();
