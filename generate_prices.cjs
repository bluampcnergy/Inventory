const fs = require('fs');
const md = fs.readFileSync('July_2026_Dealer_Price_List_Excl_GST.md', 'utf-8');
const lines = md.split('\n');

let currentCategory = '';
let sql = 'DELETE FROM price_list;\n\nINSERT INTO price_list (model_name, hsn_code, price_without_gst) VALUES\n';
let values = [];

const parsePrice = (priceStr) => parseFloat(priceStr.replace(/[^0-9.]/g, ''));

for (let line of lines) {
  line = line.trim();
  if (line.startsWith('### ') && !line.includes('Batteries') && !line.includes('Price list') && !line.includes('Lithium Inverters') && line !== '### Online UPS') {
    currentCategory = line.replace('### ', '').trim();
  } else if (line.startsWith('|') && !line.includes('---|') && !line.includes('VA Rating') && !line.includes('Voltage') && !line.includes('Period') && !line.includes('Period I') && !line.includes('Period II') && !line.includes('Period III')) {
    const parts = line.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 3 && currentCategory) {
      if (currentCategory === 'Inverter Batteries') {
         // | Voltage | Capacity | L-Acid Equivalent | Retail (excl GST) | Warranty |
         const voltage = parts[0];
         const capacity = parts[1];
         const priceStr = parts[3];
         const price = parsePrice(priceStr);
         if (!isNaN(price)) {
            const name = `${currentCategory} ${voltage}V ${capacity}`;
            values.push(`('${name}', '', ${price})`);
         }
      } else if (currentCategory === 'Cnergen OUPS Series (Online UPS)') {
         // | VA Rating | System Voltage | Configuration | Price (excl GST) | Warranty |
         const va = parts[0];
         const voltage = parts[1];
         const config = parts[2];
         const priceStr = parts[3];
         const price = parsePrice(priceStr);
         if (!isNaN(price)) {
            const name = `${currentCategory} ${va} ${voltage} ${config}`;
            values.push(`('${name}', '', ${price})`);
         }
      } else {
         // | VA Rating | System Voltage | Retail (excl GST) | Warranty |
         const va = parts[0];
         const voltage = parts[1];
         const priceStr = parts[2];
         const price = parsePrice(priceStr);
         if (!isNaN(price)) {
            const name = `${currentCategory} ${va} ${voltage}`;
            values.push(`('${name}', '', ${price})`);
         }
      }
    }
  }
}

sql += values.join(',\n') + ';\n';
fs.writeFileSync('update_prices.sql', sql);
console.log('SQL generated.');
