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

function compareTargetBiggerThanTarget(target,compareTarget){
    const result = compareTarget.every(compareValue =>
        target.every(targetValue => compareValue > targetValue)
        );
    return result
} 
(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(process.env.STOCK_LIST_URL);

  // Filter in screener
    await page.type('input[name="max_pe"]', '10');
    await page.$eval('input[name="rsi"][value="neutral"]', check => check.checked = true)
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
        let lastThreeQuarterRes = numberArray[2];
        let lastFourQuarterRes  =numberArray[3];
        let lastFiveQuarterRes = numberArray[4];
        numberArray.sort((a, b) => b - a);
        let lastOneQuarPos = findSameValuePositions(numberArray,lastOneQuarterRes);
        let lastTwoQuarPos = findSameValuePositions(numberArray,lastTwoQuarterRes);
        let last12QuarterEPS = [lastOneQuarterRes,lastTwoQuarterRes];
        let last345QuarterEPS = [lastThreeQuarterRes,lastFourQuarterRes,lastFiveQuarterRes];

        /*
        用以找到近期潜力股
       */


      //lasst 3-5 bad, last 1
      //if (lastOneQuarterRes > 0 && lastTwoQuarterRes > 0 && lastOneQuarPos >= 0 && lastOneQuarPos <= 3 && lastTwoQuarterRes >= 0 && lastTwoQuarPos <= 5){
        let excludeStock = [];
        if (lastOneQuarterRes > 0 && lastTwoQuarterRes > 0 &&
            compareTargetBiggerThanTarget(last345QuarterEPS, last12QuarterEPS)
        ){
        matchedConditionStock.push(element.stockId);
        }      
      // Close the stockPage when done with it
        await stockPage.close();
    }
  //留意价值被低估的股票
    console.table(matchedConditionStock)
    console.log(matchedConditionStock)

    await browser.close();
})();
