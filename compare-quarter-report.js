const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
dotenv.config(); // 加载 .env 文件

function findSameValuePositions(arr, targetValue) {
  let positions = 0;

  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === targetValue) {
      //positions.push(i);
      positions = i
      break
    }
  }

  return positions;
}
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(process.env.STOCK_LIST_URL);

  // Filter in screener
  await page.type('input[name="max_pe"]', '25');
  await page.type('input[name="min_dy"]', '3');
  await page.select('select[name="rtopq"]', '1'); //use the value, not the label


  console.log('Button clicked successfully');

  await page.click('#submit'); // Replace with the actual selector for the submit button
  await page.waitForSelector('.table-responsive'); // Wait for the table to load

  const stockData = await page.evaluate(() => {
    const data = [];
    const tableRows = document.querySelectorAll('.table-responsive tbody tr');

    tableRows.forEach((row) => {
      const columns = row.querySelectorAll('td');
      const rowData = {
        stockId: columns[1].textContent,
      };
      data.push(rowData);
    });

    return data;
  });

  let matchedConditionStock =[]

  for (const element of stockData) {

      const stockPage = await browser.newPage();
      await stockPage.goto(process.env.STOCK_DETAIL_URL + element.stockId);
      
      const data = await stockPage.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('#quarter_reports .financial_reports tr td.number:first-child'));
        const first20Rows = rows.slice(0, 20);
        return first20Rows.map(row => row.textContent);
      });

      const numberArray = data.map(Number);
      let lastOneQuarterRes = numberArray[0];
      let lastTwoQuarterRes = numberArray[1];
      numberArray.sort((a, b) => b - a);
      let lastOneQuarPos = findSameValuePositions(numberArray,lastOneQuarterRes)
      let lastTwoQuarPos = findSameValuePositions(numberArray,lastTwoQuarterRes)
      /*
      最新一季财报1-4/20季财报才行， 用最新一季财报来决定要不要留意该股票？同时要理解为什么revenue 和profit会升
      因为通常连续两季财报都排在1-5/20的话，已经上升不少了
      */

      if (lastOneQuarterRes > 0 && lastTwoQuarterRes > 0 && lastOneQuarPos >= 0 && lastOneQuarPos <= 3 && lastTwoQuarterRes >= 0 && lastTwoQuarPos <= 5){
        matchedConditionStock.push(element.stockId);
        if (element.stockId == 5054){
          console.log(lastOneQuarPos)
          console.log(lastTwoQuarPos)
        }
      }      
      // Close the stockPage when done with it
      await stockPage.close();
  }
  //留意价值被低估的股票
  console.table(matchedConditionStock)

  await browser.close();
})();
