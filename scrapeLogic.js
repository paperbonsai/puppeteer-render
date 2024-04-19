const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapeLogic = async (res) => {
  let browser;
  try {
    // Launch the browser
    browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--single-process",
        "--no-zygote",
        "--no-sandbox",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });

    // Create a new page instance
    const page = await browser.newPage();

    // Navigate to the page
    const navigationPromise = page.goto("https://developer.chrome.com/");

    // Wait for navigation to complete
    await navigationPromise;

    // Set screen size
    await page.setViewport({ width: 1080, height: 1024 });

    // Type into search box
    await page.type(".devsite-search-field", "automate beyond recorder");

    // Wait for search results
    await page.waitForSelector(".devsite-result-item-link");

    // Click on the first search result
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
      page.click(".devsite-result-item-link"),
    ]);

    // Get the full title of the page
    const fullTitle = await page.$eval(
      "h1.devsite-article-title",
      (el) => el.textContent
    );

    // Print the full title
    const logStatement = `The title of this blog post is ${fullTitle}`;
    console.log(logStatement);
    res.send(logStatement);
  } catch (e) {
    console.error(e);
    res.send("Error: " + e);
  } finally {
    // Close the browser
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = { scrapeLogic };
