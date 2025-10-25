
import React, { useState, useMemo } from 'react';
import type { ReceivedGood, FinishedGood, Recipe, WIPItem, LogEntry } from '../types';

interface SummaryProps {
  receivedGoods: ReceivedGood[];
  finishedGoods: FinishedGood[];
  recipes: Recipe[];
  wipItems: WIPItem[];
  logs: LogEntry[];
}

interface InvoiceRow {
  id: number;
  finishedGoodId: string;
  hsn: string;
  qty: number;
  rate: number;
  igstRate: number;
}

interface PORow {
    id: number;
    itemName: string;
    hsn: string;
    qty: number;
    rate: number;
    igstRate: number;
}

const REORDER_THRESHOLD = 0; // Trigger for items with quantity 0

// Helper to convert numbers to words
const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberToWords(num: number): string {
    if (num === 0) return 'Zero';
    if (num < 0) return "Negative numbers not supported";

    function convertLessThanThousand(n: number): string {
        let result = '';
        if (n >= 100) {
            result += ones[Math.floor(n / 100)] + ' hundred';
            n %= 100;
            if (n > 0) result += ' ';
        }
        if (n >= 20) {
            result += tens[Math.floor(n / 10)];
            n %= 10;
            if (n > 0) result += ' ';
        }
        if (n >= 10) {
            return result + teens[n - 10];
        }
        if (n > 0) {
            result += ones[n];
        }
        return result.trim();
    }

    let result = '';
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;

    if (crore > 0) result += convertLessThanThousand(crore) + ' crore ';
    if (lakh > 0) result += convertLessThanThousand(lakh) + ' lakh ';
    if (thousand > 0) result += convertLessThanThousand(thousand) + ' thousand ';
    if (remainder > 0) result += convertLessThanThousand(remainder);
    
    let finalStr = result.trim();
    if (finalStr) {
        finalStr = finalStr.charAt(0).toUpperCase() + finalStr.slice(1) + ' Rupees Only';
    }
    
    return finalStr || 'Zero Rupees Only';
}


const Summary: React.FC<SummaryProps> = ({ receivedGoods, finishedGoods, recipes, wipItems, logs }) => {
  const [copyStatus, setCopyStatus] = useState<{[key: string]: boolean}>({});
  const getRecipeName = (id: string) => recipes.find(r => r.id === id)?.name || 'Unknown Recipe';
  
  const lowStockItems = useMemo(() => receivedGoods.filter(item => item.quantity <= REORDER_THRESHOLD), [receivedGoods]);

  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([
    { id: 1, finishedGoodId: '', hsn: '', qty: 1, rate: 0, igstRate: 18 }
  ]);
  
  const [poRows, setPoRows] = useState<PORow[]>(() =>
    lowStockItems.map((item, index) => ({
        id: Date.now() + index,
        itemName: `${item.name} - ${item.makeModel}`,
        hsn: '',
        qty: 50,
        rate: 0,
        igstRate: 18,
    }))
  );

  const rawMaterialsDatalist = useMemo(() => (
    <datalist id="raw-materials-list">
        {receivedGoods.map(good => (
            <option key={good.id} value={`${good.name} - ${good.makeModel}`} />
        ))}
    </datalist>
  ), [receivedGoods]);

  const handleCopyTable = async (tableId: string, buttonId: string) => {
    const tableElementToTsv = (table: HTMLElement | null): string => {
        if (!table) return '';
        let tsv = '';
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => `"${(th as HTMLElement).innerText.replace(/"/g, '""')}"`).join('\t');
        tsv += headers + '\n';

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          if (row.classList.contains('summary-row')) return;

          const cells = row.querySelectorAll('td');
          const rowData = Array.from(cells).map(cell => {
              let value = '';
              const input = cell.querySelector('input, select') as HTMLInputElement | HTMLSelectElement | null;
              if (input) {
                  if (input.tagName === 'SELECT' && input instanceof HTMLSelectElement) {
                    value = input.options[input.selectedIndex].text;
                  } else {
                    value = input.value;
                  }
              } else {
                  value = (cell as HTMLElement).innerText;
              }
              return `"${value.trim().replace(/"/g, '""')}"`;
          });
          tsv += rowData.join('\t') + '\n';
        });
        return tsv;
    };

    let tsvOutput = '';

    if (tableId === 'inventory-summary-table') {
        const rawTable = document.getElementById('inventory-summary-table-raw');
        const wipTable = document.getElementById('inventory-summary-table-wip');
        const finishedTable = document.getElementById('inventory-summary-table-finished');
        
        const rawTsv = rawTable ? '"Raw Materials"\n' + tableElementToTsv(rawTable) : '';
        const wipTsv = wipTable ? '"Work in Progress"\n' + tableElementToTsv(wipTable) : '';
        const finishedTsv = finishedTable ? '"Finished Goods"\n' + tableElementToTsv(finishedTable) : '';
        
        tsvOutput = [rawTsv, wipTsv, finishedTsv].filter(Boolean).join('\n\n');
    } else {
        const table = document.getElementById(tableId);
        tsvOutput = tableElementToTsv(table);
    }

    if (!tsvOutput.trim()) {
        console.error('No data to copy.');
        return;
    }

    try {
        await navigator.clipboard.writeText(tsvOutput);
        setCopyStatus({ [buttonId]: true });
        setTimeout(() => setCopyStatus({ [buttonId]: false }), 2000);
    } catch (err) {
        console.error('Failed to copy table: ', err);
        alert('Failed to copy table.');
    }
  };


  const handleAddInvoiceRow = () => {
    setInvoiceRows(prev => [
        ...prev,
        { id: Date.now(), finishedGoodId: '', hsn: '', qty: 1, rate: 0, igstRate: 18 }
    ]);
  };

  const handleInvoiceRowChange = (index: number, field: keyof InvoiceRow, value: string | number) => {
    const updatedRows = [...invoiceRows];
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    updatedRows[index] = { ...updatedRows[index], [field]: field === 'finishedGoodId' || field === 'hsn' ? value : (isNaN(numericValue) ? 0 : numericValue) };
    setInvoiceRows(updatedRows);
  };
  
  const handleRemoveInvoiceRow = (id: number) => {
    setInvoiceRows(prev => prev.filter(row => row.id !== id));
  }
  
  const handleAddPoRow = () => {
    setPoRows(prev => [
        ...prev,
        { id: Date.now(), itemName: '', hsn: '', qty: 1, rate: 0, igstRate: 18 }
    ]);
  };

  const handlePoRowChange = (index: number, field: keyof Omit<PORow, 'id'>, value: string | number) => {
      const updatedRows = [...poRows];
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
      updatedRows[index] = { ...updatedRows[index], [field]: field === 'itemName' || field === 'hsn' ? value : (isNaN(numericValue) ? 0 : numericValue) };
      setPoRows(updatedRows);
  };

  const handleRemovePoRow = (id: number) => {
      setPoRows(prev => prev.filter(row => row.id !== id));
  };

  const invoiceGrandTotal = invoiceRows.reduce((acc, row) => {
    const taxableAmount = row.qty * row.rate;
    const taxAmount = (taxableAmount * row.igstRate) / 100;
    const total = taxableAmount + taxAmount;
    acc.taxableAmount += taxableAmount;
    acc.taxAmount += taxAmount;
    acc.total += total;
    return acc;
  }, { taxableAmount: 0, taxAmount: 0, total: 0 });
  
  const poGrandTotal = useMemo(() => poRows.reduce((acc, row) => {
    const taxableAmount = row.qty * row.rate;
    const taxAmount = (taxableAmount * row.igstRate) / 100;
    const total = taxableAmount + taxAmount;
    acc.taxableAmount += taxableAmount;
    acc.taxAmount += taxAmount;
    acc.total += total;
    return acc;
  }, { taxableAmount: 0, taxAmount: 0, total: 0 }), [poRows]);

  const handleDownloadJsonBackup = () => {
    const backupData: { [key: string]: any } = {};
    const keysToBackup = ['users', 'currentUser', 'receivedGoods', 'recipes', 'wipItems', 'finishedGoods', 'repairItems', 'logs'];
    keysToBackup.forEach(key => {
        const item = window.localStorage.getItem(key);
        if (item) {
            backupData[key] = JSON.parse(item);
        }
    });

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `plant_inventory_backup_${date}.json`;
    link.click();
  };

  const handleDownloadDailyLogCsv = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyLogs = logs.filter(log => log.timestamp >= today.getTime());

    if (dailyLogs.length === 0) {
        alert("No activity to export for today.");
        return;
    }

    const header = "Timestamp,Username,Action,Details\n";
    const csvRows = dailyLogs.map(log => {
        const timestamp = `"${new Date(log.timestamp).toLocaleString()}"`;
        const username = `"${log.username}"`;
        const action = `"${log.action}"`;
        const details = `"${log.details.replace(/"/g, '""')}"`; // escape double quotes
        return [timestamp, username, action, details].join(',');
    });

    const csvString = header + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `daily_activity_log_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Summary</h1>
        </div>

        {/* Inventory Summary */}
        <div className="bg-white p-6 rounded-lg shadow-md">
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-semibold text-gray-700">Inventory Summary</h2>
             <button onClick={() => handleCopyTable('inventory-summary-table', 'invCopy')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm w-32">
                {copyStatus.invCopy ? 'Copied!' : 'Copy Table'}
             </button>
           </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2 border-b pb-2">Raw Materials</h3>
              <table id="inventory-summary-table-raw" className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2">Item Name</th>
                    <th className="p-2">Make/Model</th>
                    <th className="p-2">Supplier</th>
                    <th className="p-2 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {receivedGoods.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.makeModel}</td>
                      <td className="p-2">{item.supplier}</td>
                      <td className={`p-2 text-right font-semibold ${item.quantity <= REORDER_THRESHOLD ? 'text-red-600' : ''}`}>{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 border-b pb-2">Work in Progress</h3>
              <table id="inventory-summary-table-wip" className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2">Product Name</th>
                    <th className="p-2 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {wipItems.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{getRecipeName(item.recipeId)}</td>
                      <td className="p-2 text-right font-semibold">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 border-b pb-2">Finished Goods</h3>
              <table id="inventory-summary-table-finished" className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2">Product Name</th>
                    <th className="p-2">Delivered To</th>
                    <th className="p-2 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {finishedGoods.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{getRecipeName(item.recipeId)}</td>
                      <td className="p-2">{item.deliveredTo || 'In Stock'}</td>
                      <td className="p-2 text-right font-semibold">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Purchase Order Table */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700">Purchase Order Generator</h2>
                <button onClick={() => handleCopyTable('po-table', 'poCopy')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm w-32">
                    {copyStatus.poCopy ? 'Copied!' : 'Copy Table'}
                </button>
            </div>
             <p className="text-sm text-gray-600 mb-4">Out of stock items (quantity is 0) are pre-populated. You can add more items or edit existing ones.</p>
            <div className="overflow-x-auto">
                {rawMaterialsDatalist}
                <table id="po-table" className="w-full min-w-[800px] text-left text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-2 w-12">#</th>
                            <th className="p-2 w-1/4">Item name</th>
                            <th className="p-2">HSN/SAC</th>
                            <th className="p-2">Required Quantity</th>
                            <th className="p-2">Rate (₹)</th>
                            <th className="p-2">Taxable amount (₹)</th>
                            <th className="p-2">IGST (Rate)</th>
                            <th className="p-2">Tax amount (₹)</th>
                            <th className="p-2">Total (₹)</th>
                            <th className="p-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {poRows.map((row, index) => {
                            const taxableAmount = row.qty * row.rate;
                            const taxAmount = (taxableAmount * row.igstRate) / 100;
                            const total = taxableAmount + taxAmount;
                            return (
                                <tr key={row.id} className="border-b hover:bg-gray-50">
                                    <td className="p-2 text-center">{index + 1}</td>
                                    <td className="p-1">
                                      <input 
                                        type="text" 
                                        list="raw-materials-list"
                                        value={row.itemName} 
                                        onChange={e => handlePoRowChange(index, 'itemName', e.target.value)} 
                                        className="w-full p-1 border rounded-md"
                                        placeholder="Select or type item name"
                                      />
                                    </td>
                                    <td className="p-1"><input type="text" value={row.hsn} onChange={e => handlePoRowChange(index, 'hsn', e.target.value)} className="w-full p-1 border rounded-md"/></td>
                                    <td className="p-1"><input type="number" value={row.qty} onChange={e => handlePoRowChange(index, 'qty', e.target.value)} className="w-24 p-1 border rounded-md text-right"/></td>
                                    <td className="p-1"><input type="number" value={row.rate} onChange={e => handlePoRowChange(index, 'rate', e.target.value)} className="w-24 p-1 border rounded-md text-right"/></td>
                                    <td className="p-2 text-right bg-gray-50">{taxableAmount.toFixed(2)}</td>
                                    <td className="p-1"><input type="number" value={row.igstRate} onChange={e => handlePoRowChange(index, 'igstRate', e.target.value)} className="w-20 p-1 border rounded-md text-right" placeholder='e.g. 18'/></td>
                                    <td className="p-2 text-right bg-gray-50">{taxAmount.toFixed(2)}</td>
                                    <td className="p-2 text-right bg-gray-100 font-semibold">{total.toFixed(2)}</td>
                                    <td className="p-1 text-center">
                                      <button onClick={() => handleRemovePoRow(row.id)} className="text-red-400 hover:text-red-600 p-1 rounded-full">&times;</button>
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold summary-row">
                            <td colSpan={5} className="p-2 text-right">Total</td>
                            <td className="p-2 text-right">{poGrandTotal.taxableAmount.toFixed(2)}</td>
                            <td></td>
                            <td className="p-2 text-right">{poGrandTotal.taxAmount.toFixed(2)}</td>
                            <td className="p-2 text-right">{poGrandTotal.total.toFixed(2)}</td>
                            <td></td>
                        </tr>
                        <tr className="bg-gray-50 summary-row">
                            <td colSpan={2} className="p-2 font-semibold">Amount in words</td>
                            <td colSpan={8} className="p-2 text-left font-semibold text-gray-700">{numberToWords(parseFloat(poGrandTotal.total.toFixed(2)))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <button onClick={handleAddPoRow} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ Add Row</button>
        </div>

        {/* Invoice Table */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700">Invoice Table</h2>
                <button onClick={() => handleCopyTable('invoice-table', 'invoiceCopy')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm w-32">
                    {copyStatus.invoiceCopy ? 'Copied!' : 'Copy Table'}
                </button>
            </div>
            <div className="overflow-x-auto">
                <table id="invoice-table" className="w-full min-w-[800px] text-left text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-2 w-12">#</th>
                            <th className="p-2 w-1/4">Item name</th>
                            <th className="p-2">HSN/SAC</th>
                            <th className="p-2">Qty</th>
                            <th className="p-2">Rate (₹)</th>
                            <th className="p-2">Taxable amount (₹)</th>
                            <th className="p-2">IGST (Rate)</th>
                            <th className="p-2">Tax amount (₹)</th>
                            <th className="p-2">Total (₹)</th>
                            <th className="p-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoiceRows.map((row, index) => {
                            const taxableAmount = row.qty * row.rate;
                            const taxAmount = (taxableAmount * row.igstRate) / 100;
                            const total = taxableAmount + taxAmount;
                            return (
                                <tr key={row.id} className="border-b hover:bg-gray-50">
                                    <td className="p-2 text-center">{index + 1}</td>
                                    <td className="p-1">
                                        <select value={row.finishedGoodId} onChange={e => handleInvoiceRowChange(index, 'finishedGoodId', e.target.value)} className="w-full p-1 border rounded-md bg-white">
                                            <option value="">Select Item</option>
                                            {finishedGoods.map(fg => <option key={fg.id} value={fg.id}>{getRecipeName(fg.recipeId)}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-1"><input type="text" value={row.hsn} onChange={e => handleInvoiceRowChange(index, 'hsn', e.target.value)} className="w-full p-1 border rounded-md"/></td>
                                    <td className="p-1"><input type="number" value={row.qty} onChange={e => handleInvoiceRowChange(index, 'qty', e.target.value)} className="w-16 p-1 border rounded-md text-right"/></td>
                                    <td className="p-1"><input type="number" value={row.rate} onChange={e => handleInvoiceRowChange(index, 'rate', e.target.value)} className="w-24 p-1 border rounded-md text-right"/></td>
                                    <td className="p-2 text-right bg-gray-50">{taxableAmount.toFixed(2)}</td>
                                    <td className="p-1"><input type="number" value={row.igstRate} onChange={e => handleInvoiceRowChange(index, 'igstRate', e.target.value)} className="w-20 p-1 border rounded-md text-right" placeholder='e.g. 18'/></td>
                                    <td className="p-2 text-right bg-gray-50">{taxAmount.toFixed(2)}</td>
                                    <td className="p-2 text-right bg-gray-100 font-semibold">{total.toFixed(2)}</td>
                                    <td className="p-1 text-center">
                                      <button onClick={() => handleRemoveInvoiceRow(row.id)} className="text-red-400 hover:text-red-600 p-1 rounded-full">&times;</button>
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold summary-row">
                            <td colSpan={5} className="p-2 text-right">Total</td>
                            <td className="p-2 text-right">{invoiceGrandTotal.taxableAmount.toFixed(2)}</td>
                            <td></td>
                            <td className="p-2 text-right">{invoiceGrandTotal.taxAmount.toFixed(2)}</td>
                            <td className="p-2 text-right">{invoiceGrandTotal.total.toFixed(2)}</td>
                            <td></td>
                        </tr>
                        <tr className="bg-gray-50 summary-row">
                            <td colSpan={2} className="p-2 font-semibold">Amount in words</td>
                            <td colSpan={8} className="p-2 text-left font-semibold text-gray-700">{numberToWords(parseFloat(invoiceGrandTotal.total.toFixed(2)))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <button onClick={handleAddInvoiceRow} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ Add Row</button>
        </div>

        {/* Backup & Export */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Backup & Export</h2>
            <p className="text-sm text-gray-600 mb-4">
              For data safety, please download your backup files regularly. An automated backup to a cloud drive is not possible in this browser-only application and requires a dedicated server.
            </p>
            <div className="flex space-x-4">
              <button onClick={handleDownloadJsonBackup} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                Download Full Backup (JSON)
              </button>
              <button onClick={handleDownloadDailyLogCsv} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Download Daily Activity Log (CSV)
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;
