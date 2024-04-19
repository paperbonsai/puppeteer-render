const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapeLogic = async (res) => {
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  try {
    const page = await browser.newPage();

    await page.goto("https://simplecode.cz");

    // Wait for h1 element to appear
    await page.waitForSelector("h1");

    // Get the text content of the h1 element
    const h1Text = await page.evaluate(() => {
      const h1Element = document.querySelector("h1");
      return h1Element ? h1Element.textContent.trim() : null;
    });

    if (h1Text) {
      const logStatement = `The h1 text of the page is: ${h1Text}`;
      console.log(logStatement);
      res.send(logStatement);
    } else {
      res.send("No h1 element found on the page.");
    }
  } catch (e) {
    console.error(e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };
