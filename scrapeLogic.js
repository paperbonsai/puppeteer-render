const puppeteer = require("puppeteer");
require("dotenv").config();

const config = {
  baseUrl: "https://aukro.cz/pc-graficke-karty",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0",
  nextPageSelector:
    "auk-listing-items-list > div > auk-pagination-control > a.page-number.next > i",
  itemSelector:
    "a.item-card-main-container > div.item-card-body-wrapper > div.item-card-body-wrapper-top-container > auk-basic-item-card-title > h2",
  launchOptions: {
    headless: true,
    args: [
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu-compositing",
      "--disable-software-rasterizer", // Only if you don't need WebGL or 3D CSS transforms.
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  },
  viewport: {
    width: 1920,
    height: 1080,
  },
};

async function launchBrowser() {
  return puppeteer.launch(config.launchOptions);
}

async function scrapeLogic(res) {
  console.time("ScrapeLogicExecutionTime");
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();

    // Set user agent and viewport size
    await page.setUserAgent(config.userAgent);
    await page.setViewport(config.viewport);

    res.setHeader("Content-Type", "application/json; charset=utf-8");

    const allData = await scrapePages(page);
    res.write(JSON.stringify(allData, null, 2));
    res.end();
  } catch (error) {
    console.error("Error during scraping: ", error);
    res.send(
      JSON.stringify({ error: `Při běhu Puppeteer došlo k chybě: ${error}` })
    );
    res.end();
  } finally {
    await browser.close();
    console.timeEnd("ScrapeLogicExecutionTime");
  }
}

async function scrapePages(page) {
  let currentPage = 1;
  let url = `${config.baseUrl}?size=180`;
  let allData = [];

  while (true) {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await autoScroll(page);

    const h2Texts = await page.$$eval(config.itemSelector, (elements) =>
      elements.map((element) => element.textContent.trim())
    );
    allData.push(...h2Texts.map((title) => ({ title })));
    console.log(`${h2Texts.length} titles scraped from page ${currentPage}`);

    const nextPage = await navigateToNextPage(page);
    if (!nextPage) {
      console.log("DONE: Reached the last page.");
      break;
    }

    currentPage++;
    url = `${config.baseUrl}?page=${currentPage}&size=180`;
  }

  return allData;
}

async function navigateToNextPage(page) {
  const nextPageButton = await page.$(config.nextPageSelector);
  if (nextPageButton) {
    await nextPageButton.evaluate((b) => b.scrollIntoView());
    await nextPageButton.click();
    return page
      .waitForNavigation({ waitUntil: "networkidle2" })
      .then(() => true)
      .catch(() => false);
  }
  return false;
}

async function autoScroll(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 200;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
      })
  );
}

module.exports = { scrapeLogic };