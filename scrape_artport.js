const puppeteer = require('puppeteer');
const { createObjectCsvWriter } = require('csv-writer');

async function scrapeArtportPage(url) {
  console.log(`Launching Puppeteer...`);
  const browser = await puppeteer.launch();
  console.log(`Puppeteer launched successfully.`);

  const page = await browser.newPage();

  console.log(`Navigating to URL: ${url}...`);
  await page.goto(url);

  console.log(`Extracting data from the page...`);
  const data = await page.evaluate(() => {
    const exhibitions = [];
    const tableRows = document.querySelectorAll('table tr');

    tableRows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length === 3) {
        const date = cells[0].innerText.trim();
        const artist = cells[1].innerText.trim();
        const url = cells[2].querySelector('a').href;
        exhibitions.push({ date, artist, url });
      }
    });

    return exhibitions;
  });
  console.log(`Data extracted successfully.`);

  console.log(`Closing Puppeteer...`);
  await browser.close();
  console.log(`Puppeteer closed successfully.`);

  const csvPath = `artport_whitney_org.csv`;
  console.log(`Writing data to CSV file: ${csvPath}...`);
  const csvWriter = createObjectCsvWriter({
    path: csvPath,
    header: [
      { id: 'date', title: 'date' },
      { id: 'artist', title: 'artist' },
      { id: 'url', title: 'website' }
    ]
  });
  await csvWriter.writeRecords(data);
  console.log(`CSV file '${csvPath}' created successfully.`);
}

const artportUrl = 'https://artport.whitney.org/v2/gatepages/index.shtml';
scrapeArtportPage(artportUrl);
