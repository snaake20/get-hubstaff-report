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

  const unformatted = date.match(/\d+/)
  const formatted = `${unformatted[2]}-${unformatted[1]}-${unformatted[0]}`

  const logStream = fs.createWriteStream(`reports/Raport ${process.env.name} ${date}.txt`, {flags: 'w'});
  logStream.write('Raportul pentru azi:\n');


  const driver = await new Builder().forBrowser("chrome").build();

  await driver.get("https://app.hubstaff.com/login");

  await driver.findElement(By.xpath('//*[@id="user_email"]')).sendKeys(`${process.env.email}`);

  await driver.findElement(By.xpath('//*[@id="user_password"]')).sendKeys(`${process.env.password}`, Key.ENTER).then(() => console.log('logged in'));

  const link = await driver.getCurrentUrl()
  const id = link.match(/\d+/)[0]

  await driver.get(`https://app.hubstaff.com/reports/${id}/my/time_and_activities?date=${formatted}&date_end=${formatted}&group_by=date&filters[show_tasks]=true&filters[show_notes]=true&filters[show_activity]=true&filters[show_break_time]=true&filters[show_spent]=true&filters[show_billable]=&filters[include_archived]=true&filters[exclude_work_breaks]=true&filters[show_manual]=true`).then(() => console.log('Got to report page'))

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
    logStream.write(`\t${project || '\t'}${task || ''} ${time}\n`);
  }
  logStream.write(`Total: ${totalHours}\n`);
  logStream.end("created with https://github.com/snaake20/Get_HubStaff_Report \n");

  await driver.quit().then(() => console.log('done!'));
}

(async () => {
  const rl = readline.createInterface({
    input: process.stdin, output: process.stdout
  });
  await new Promise(res => {
    rl.question('Enter the date for the report (formats: dd.mm.yyyy) ', res)
  }).then((res) => {
    getDailyReport(res).then(() => process.exit())
  })
})();
