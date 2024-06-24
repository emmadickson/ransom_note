
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const csv = require('csv-parser');
const axios = require('axios');
const { createObjectCsvWriter } = require('csv-writer');

// Extract command-line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node script.js <input_csv_path>');
  process.exit(1);
}
const inputCsvPath = args[0];
const inputCsvPathFolder = args[0].replace(/\.csv$/, '');


// Function to create a folder
const createFolder = (folderName) => {
  // Check if the folder already exists
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName); // Create the folder
    console.log(`Folder "${folderName}" created successfully.`);
  } else {
    console.log(`Folder "${folderName}" already exists.`);
  }
};
createFolder(inputCsvPathFolder);
// Define other paths
const outputCsvPath = `${inputCsvPathFolder}/${inputCsvPathFolder}_processed.csv`;
const screenshotDir = `${inputCsvPathFolder}/screenshots`;


// Create screenshot directory if it doesn't exist
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir);
}


// Function to read CSV file
const readCsv = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// Function to write CSV file
const writeCsv = (filePath, data) => {
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: Object.keys(data[0]).map((key) => ({ id: key, title: key })),
  });
  return csvWriter.writeRecords(data);
};

// Function to check Wayback Machine for the oldest capture date
const checkWaybackMachine = async (url) => {
  try {
    const response = await axios.get(`http://web.archive.org/cdx/search/cdx?url=${url}&output=json&limit=1&filter=statuscode:200&from=1996`);
    if (response.data && response.data.length > 1) {
      const captureTimestamp = response.data[1][1];
      const captureUrl = `http://web.archive.org/web/${captureTimestamp}/${url}`;
      return { "date": captureTimestamp, "url": captureUrl };
    }
  } catch (error) {
    console.error(`Error checking Wayback Machine for ${url}: ${error}`);
  }
  return null;
};
requestCounter = 0
const extractDomain = (url) => {
  if (url.startsWith('www.')) {
    url = url.slice(4); // Remove 'www.' prefix if present
  }

  if (url.endsWith('/')) {
    url = url.slice(0, -1); // Remove trailing '/'
  }

  const hostnameParts = url.replace('http://', '').replace('https://', '').split('/');
  const domainParts = hostnameParts[0].split('.'); // Split by '.' to get the domain parts
  if (domainParts.length >= 2 && domainParts[domainParts.length - 2] === 'org' && domainParts[domainParts.length - 1] === 'uk') {
    return domainParts.slice(-3).join('.'); // Return the last three parts for org.uk
  }
  if (domainParts.length >= 2 && domainParts[domainParts.length - 2] === 'com' && domainParts[domainParts.length - 1] === 'au') {
    return domainParts.slice(-3).join('.'); // Return the last three parts for com.au
  }
  if (domainParts.length >= 2 && domainParts[domainParts.length - 2] === 'net' && domainParts[domainParts.length - 1] === 'au') {
    return domainParts.slice(-3).join('.'); // Return the last three parts for com.au
  }
  if (domainParts.length >= 2 && domainParts[domainParts.length - 2] === 'ac' && domainParts[domainParts.length - 1] === 'uk') {
    return domainParts.slice(-3).join('.'); // Return the last three parts for com.au
  }
  if (domainParts.length >= 2 && domainParts[domainParts.length - 2] === 'uk' && domainParts[domainParts.length - 1] === 'net') {
    return domainParts.slice(-3).join('.'); // Return the last three parts for com.au
  }
  return domainParts.slice(-2).join('.'); // Return the last two parts for other domains
};
// Main function
(async () => {
  // Read the input CSV
  const websites = await readCsv(inputCsvPath);

    // Add new columns for screenshot paths and archive availability if they don't exist
   if (!websites[0].hasOwnProperty('screenshots')) {
     websites.forEach(website => website.screenshots = '');
   }
   if (!websites[0].hasOwnProperty('archive available at')) {
     websites.forEach(website => website['archive available at'] = '');
   }
   if (!websites[0].hasOwnProperty('archive capture link')) {
     websites.forEach(website => website['archive capture link'] = '');
   }


  // Launch Puppeteer
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Iterate over each website and take screenshots
  for (let i = 0; i < websites.length; i++) {
    let website = websites[i].website;
    if (website != ''){

      if (!website.startsWith('http')) {
        website = 'http://' + website;
      }

      console.log(`\n\nAccessing ${website}`);
      let canAccess = 'N'; // Default value

      try {
        await page.goto(website, { waitUntil: 'networkidle2' });
        const screenshotPath = path.join(screenshotDir, `${i}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved at ${screenshotPath}`);
        canAccess = 'Y'; // Set to 'Y' if accessed successfully

        websites[i].screenshots = screenshotPath;
      } catch (error) {
        console.error(`Failed to take screenshot for ${website}: ${error}`);
        websites[i].screenshots = 'Failed to capture screenshot';
      }
      console.log(`Checking archive ${website}`);
      websites[i]['can access'] = canAccess;

       const domain = extractDomain(website);

       websites[i]['base url'] = domain

      // Check Wayback Machine for the oldest capture date
      const oldestCapture = await checkWaybackMachine(website);

      if (oldestCapture) {
        console.log(`Oldest capture date for ${website}: ${oldestCapture.date}`);
        websites[i]['archive available at'] = oldestCapture.date;
        websites[i]['archive capture link'] = oldestCapture.url

      } else {
        console.log(`No archive available for ${website}`)
        websites[i]['archive available at'] = 0;
      }

    }
}
  // Close Puppeteer
  await browser.close();

  // Write the output CSV
  await writeCsv(outputCsvPath, websites);
})();
