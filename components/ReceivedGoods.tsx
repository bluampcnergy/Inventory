
import React, { useState, useRef } from 'react';
import type { ReceivedGood } from '../types';
import { ReceivedGoodStatus } from '../types';
import Modal from './Modal';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { ImportIcon } from './icons/ImportIcon';

interface ReceivedGoodsProps {
  receivedGoods: ReceivedGood[];
  setReceivedGoods: React.Dispatch<React.SetStateAction<ReceivedGood[]>>;
  addLogEntry: (action: string, details: string) => void;
}

const statusInfo = {
  [ReceivedGoodStatus.ND]: { text: 'Not Damaged', color: 'bg-green-100 text-green-800' },
  [ReceivedGoodStatus.PR]: { text: 'Partially Received', color: 'bg-yellow-100 text-yellow-800' },
  [ReceivedGoodStatus.D]: { text: 'Damaged', color: 'bg-red-100 text-red-800' },
  [ReceivedGoodStatus.Other]: { text: 'Other', color: 'bg-gray-100 text-gray-800' },
};

const initialFormState: Omit<ReceivedGood, 'id' | 'timestamp' | 'serials'> & { serials: string[] } = {
  name: '', makeModel: '', supplier: '', quantity: 0, status: ReceivedGoodStatus.ND, damagedCount: 0, invoiceNumber: '', serials: []
};

const ReceivedGoods: React.FC<ReceivedGoodsProps> = ({ receivedGoods, setReceivedGoods, addLogEntry }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGood, setEditingGood] = useState<ReceivedGood | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [serialsText, setSerialsText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // State for Serial Number Generator
  const [prefix, setPrefix] = useState('INV-2023-001');
  const [startNumber, setStartNumber] = useState(50);
  const [totalCount, setTotalCount] = useState(800);
  const [generatedSerials, setGeneratedSerials] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'quantity' || name === 'damagedCount' ? Number(value) : value }));
  };

  const handleSerialsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSerialsText(e.target.value);
  };

  const handleOpenAddModal = () => {
    setEditingGood(null);
    setFormData(initialFormState);
    setSerialsText('');
    setIsModalOpen(true);
  };

  const handleEdit = (good: ReceivedGood) => {
    setEditingGood(good);
    setFormData({
        name: good.name,
        makeModel: good.makeModel,
        supplier: good.supplier,
        quantity: good.quantity,
        status: good.status,
        damagedCount: good.damagedCount,
        invoiceNumber: good.invoiceNumber,
        serials: good.serials,
    });
    setSerialsText(good.serials.join('\n'));
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const serials = serialsText.split('\n').filter(s => s.trim() !== '');

    if (editingGood) {
      const updatedGood: ReceivedGood = {
        ...editingGood,
        ...formData,
        serials,
      };
      setReceivedGoods(prev => prev.map(g => g.id === editingGood.id ? updatedGood : g));
      addLogEntry('Updated Raw Material', `Updated '${updatedGood.name}' (Qty: ${updatedGood.quantity}, Status: ${statusInfo[updatedGood.status].text}).`);
    } else {
      const newGood: ReceivedGood = {
        ...formData,
        id: `rec-${Date.now()}`,
        timestamp: Date.now(),
        serials,
      };
      setReceivedGoods(prev => [newGood, ...prev]);
      addLogEntry('Added Raw Material', `Added ${newGood.quantity} units of '${newGood.name}'.`);
    }
    
    setIsModalOpen(false);
    setEditingGood(null);
  };

  const handleGenerateSerials = (e: React.FormEvent) => {
    e.preventDefault();
    const serials = [];
    const endNumber = startNumber + totalCount - 1;
    const paddingLength = String(endNumber).length;

    for (let i = 0; i < totalCount; i++) {
      const currentNumber = startNumber + i;
      const paddedNumber = String(currentNumber).padStart(paddingLength, '0');
      serials.push(`${prefix}-${paddedNumber}`);
    }
    setGeneratedSerials(serials.join('\n'));
  };

  const handleCopyToClipboard = () => {
    if (generatedSerials) {
      navigator.clipboard.writeText(generatedSerials);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  const mapStatusStringToEnum = (statusStr: string): ReceivedGoodStatus => {
    const normalized = statusStr.trim().toLowerCase();
    switch (normalized) {
        case 'not damaged':
            return ReceivedGoodStatus.ND;
        case 'partially received':
            return ReceivedGoodStatus.PR;
        case 'damaged':
            return ReceivedGoodStatus.D;
        case 'other':
            return ReceivedGoodStatus.Other;
        default:
            return ReceivedGoodStatus.Other;
    }
  };

  const parseAndImportCsv = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        alert('CSV file is empty or has no data rows.');
        return;
    }

    const header = lines[0].split(',').map(h => h.trim());
    const expectedHeader = ['Item Name', 'Make & Model', 'Supplier Company', 'Tax Invoice Number', 'Quantity', 'Received As'];
    
    // Naive header check.
    if (header.length !== expectedHeader.length || !header.every((h, i) => h.toLowerCase() === expectedHeader[i].toLowerCase())) {
        alert(`Invalid CSV header. Expected: ${expectedHeader.join(', ')}`);
        return;
    }

    const newGoods: ReceivedGood[] = [];
    const errors: string[] = [];

    lines.slice(1).forEach((line, index) => {
        if (!line.trim()) return; 

        const values = line.split(',');
        if (values.length !== expectedHeader.length) {
            errors.push(`Row ${index + 2}: Incorrect number of columns. Expected ${expectedHeader.length}, found ${values.length}.`);
            return;
        }

        const [name, makeModel, supplier, invoiceNumber, quantityStr, statusStr] = values.map(v => v.trim());

        const quantity = parseInt(quantityStr, 10);
        if (isNaN(quantity) || quantity < 0) {
            errors.push(`Row ${index + 2}: Invalid quantity "${quantityStr}". Must be a non-negative number.`);
            return;
        }

        const newGood: ReceivedGood = {
            id: `rec-${Date.now()}-${index}`,
            timestamp: Date.now(),
            name,
            makeModel,
            supplier,
            invoiceNumber,
            quantity,
            status: mapStatusStringToEnum(statusStr),
            damagedCount: 0,
            serials: [],
        };
        newGoods.push(newGood);
    });

    if (errors.length > 0) {
        alert(`Errors found in CSV:\n${errors.join('\n')}`);
    }

    if (newGoods.length > 0) {
        setReceivedGoods(prev => [...newGoods, ...prev]);
        addLogEntry('Imported Raw Materials', `Imported ${newGoods.length} items via CSV.`);
        alert(`${newGoods.length} items imported successfully.`);
    } else if (errors.length === 0) {
        alert('No new items to import from the CSV file.');
    }
  };


  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result;
          if (typeof text === 'string') {
              parseAndImportCsv(text);
          }
      };
      reader.onerror = () => {
        alert('Error reading file.');
      }
      reader.readAsText(file);
      e.target.value = ''; 
  };
  
  const filteredGoods = receivedGoods.filter(good => 
    good.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Raw Materials</h1>
        <div className="flex items-center space-x-2">
            <button
              onClick={handleImportClick}
              className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors"
            >
              <ImportIcon />
              <span className="ml-2">Import CSV</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors"
            >
              <PlusIcon />
              <span className="ml-2">Add New Entry</span>
            </button>
        </div>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".csv, text/csv"
        />
      </div>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
        </div>
        <input 
          type="text" 
          placeholder="Search by item name..." 
          className="block w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Serial Number Generator */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Serial Number Generator</h2>
        <form onSubmit={handleGenerateSerials} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Alphanumeric Text</label>
                <input type="text" value={prefix} onChange={e => setPrefix(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Numeric Start From</label>
                <input type="number" value={startNumber} onChange={e => setStartNumber(Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" min="0" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Total Serial Numbers</label>
                <input type="number" value={totalCount} onChange={e => setTotalCount(Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" min="1" required />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 h-10">Generate</button>
        </form>
        {generatedSerials && (
            <div className="mt-4">
                 <label className="block text-sm font-medium text-gray-700">Generated Serials</label>
                 <textarea value={generatedSerials} readOnly rows={8} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50 font-mono"></textarea>
                 <button onClick={handleCopyToClipboard} className="mt-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm w-full md:w-auto">
                    {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                 </button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredGoods.map(good => (
          <div key={good.id} className="bg-white rounded-lg shadow-md p-5 flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div>
              <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-gray-900">{good.name}</h3>
                  <div className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo[good.status].color}`}>
                    {statusInfo[good.status].text}
                  </div>
              </div>
              <p className="text-sm text-gray-600">{good.makeModel}</p>
              <p className="text-sm text-gray-500 mt-2">Supplier: {good.supplier}</p>
              <p className="text-sm text-gray-500">Invoice: {good.invoiceNumber}</p>
              <p className="text-xs text-gray-400 mt-1">Received: {new Date(good.timestamp).toLocaleString()}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <div className="text-center">
                    <p className="text-xs text-gray-500">Quantity</p>
                    <p className="font-bold text-xl text-blue-600">{good.quantity}</p>
                </div>
                {good.status === ReceivedGoodStatus.D && (
                    <div className="text-center">
                        <p className="text-xs text-gray-500">Damaged</p>
                        <p className="font-bold text-xl text-red-600">{good.damagedCount}</p>
                    </div>
                )}
                <div className="text-center">
                    <p className="text-xs text-gray-500">Serials</p>
                    <p className="font-bold text-xl">{good.serials.length}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end space-x-2">
                <button onClick={() => handleEdit(good)} className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-100 rounded-full transition-colors" title="Edit Item"><PencilIcon /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGood ? "Edit Raw Material" : "Add New Raw Material"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700">Item Name</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required /></div>
          <div><label className="block text-sm font-medium text-gray-700">Make & Model</label><input type="text" name="makeModel" value={formData.makeModel} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required /></div>
          <div><label className="block text-sm font-medium text-gray-700">Supplier Company</label><input type="text" name="supplier" value={formData.supplier} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required /></div>
          <div><label className="block text-sm font-medium text-gray-700">Tax Invoice Number</label><input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700">Quantity</label><input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" min="0" required /></div>
            <div><label className="block text-sm font-medium text-gray-700">Received As</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
                {Object.values(ReceivedGoodStatus).map(s => <option key={s} value={s}>{statusInfo[s].text}</option>)}
              </select>
            </div>
          </div>
          {formData.status === ReceivedGoodStatus.D && (
            <div><label className="block text-sm font-medium text-gray-700">Damaged Count</label><input type="number" name="damagedCount" value={formData.damagedCount} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" min="0" /></div>
          )}
          <div><label className="block text-sm font-medium text-gray-700">Serial Numbers (one per line)</label><textarea name="serials" value={serialsText} onChange={handleSerialsChange} rows={4} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea></div>
          <div className="flex justify-end pt-4"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save Entry</button></div>
        </form>
      </Modal>

    </div>
  );
};

export default ReceivedGoods;