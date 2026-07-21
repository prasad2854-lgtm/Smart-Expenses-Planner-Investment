const data = 'Union Bank of India A/c *1194 Debited Rs:1.00 on 22-07-2026 01:06:45 by Mob Bk ref no 100504916649, Fvg: DARLA K Avl Bal Rs:44.95. Not you?Call 18002333/ SMS BLOCK 1194 to 8879365472';
const amountMatch = data.match(/(?:Rs\.?:?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) || data.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:INR)/i) || data.match(/paid\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i);
console.log(amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0);
