const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const puppeteer = require('puppeteer');

const years = [1983, 1991, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2023]

const baseUrl = 'https://artbase.rhizome.org/wiki/Browse/by_year/';

const csvWriter = createCsvWriter({
    path: 'rhizome_artbase.csv',
    header: [
        { id: 'artistName', title: 'artist' },
        { id: 'pieceName', title: 'title' },
        { id: 'date', title: 'date' },
        { id: 'outsideLinkElement', title: 'website' },
    ]
});


(async () => {
    let records = [];
    const browser = await puppeteer.launch();

    for (const year of years) {
        console.log(`Processing year: ${year}`);
        try {
            const { data } = await axios.get(`${baseUrl}${year}`);
            const $ = cheerio.load(data);

            $('.artbase-artwork-1').each(async (i, element) => {
                const artworkUrl = $(element).find('a').attr('href');
                if (!artworkUrl) return;

                console.log(`Processing artwork URL: ${artworkUrl}`);

                const { data: artworkData } = await axios.get(artworkUrl);
                const $$ = cheerio.load(artworkData);

                const pieceName = $$('.firstHeading').text().trim();
                const date = $$('.artbase-property-P26 .artbase-value span').first().text().trim();
                const artistName = $$('.artbase-property-P29 .artbase-value a').text().trim();
                const outsideLinkElement = $$('div.artbase-instance-of-Q11991 .artbase-property-P46 .artbase-value a').text().trim();

                console.log(`Piece Name: ${pieceName}`);
                console.log(`Artist Name: ${artistName}`);
                console.log(`Date: ${date}`);
                console.log(`Website: ${outsideLinkElement}`);



                records.push({
                    pieceName,
                    artistName,
                    date,
                    outsideLinkElement
                });

            });
        } catch (error) {
            console.error(`Error fetching data for year: ${year}`, error);
        }
    }

    await csvWriter.writeRecords(records);
    await browser.close();
    console.log('CSV file created successfully.');
})();
