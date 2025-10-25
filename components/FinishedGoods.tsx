import React, { useState } from 'react';
import type { FinishedGood, Recipe, ReceivedGood, RepairItem } from '../types';
import Modal from './Modal';
import { SpannerIcon } from './icons/SpannerIcon';

interface FinishedGoodsProps {
  finishedGoods: FinishedGood[];
  setFinishedGoods: React.Dispatch<React.SetStateAction<FinishedGood[]>>;
  recipes: Recipe[];
  receivedGoods: ReceivedGood[];
  setRepairItems: React.Dispatch<React.SetStateAction<RepairItem[]>>;
  addLogEntry: (action: string, details: string) => void;
}

const FinishedGoods: React.FC<FinishedGoodsProps> = ({ finishedGoods, setFinishedGoods, recipes, receivedGoods, setRepairItems, addLogEntry }) => {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedGood, setSelectedGood] = useState<FinishedGood | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getRecipeName = (id: string) => recipes.find(r => r.id === id)?.name || 'Unknown Recipe';
  const getGoodName = (id: string) => receivedGoods.find(g => g.id === id)?.name || 'Unknown Item';

  const handleOpenDetails = (good: FinishedGood) => {
    setSelectedGood(good);
    setIsDetailsModalOpen(true);
  };

  const handleSendToRepair = (good: FinishedGood, unitId: string) => {
    // Prevent sending a unit that's already marked for repair in the current view
    if (selectedGood?.inRepairUnitIds?.includes(unitId)) return;

    addLogEntry('Sent to Repair', `Sent unit '${unitId}' of '${getRecipeName(good.recipeId)}' to repair.`);

    // 1. Create a new repair item and add it to the repair list
    const newRepairItem: RepairItem = {
      id: `repair-${Date.now()}`,
      finishedGoodId: good.id,
      recipeId: good.recipeId,
      unitId: unitId,
      timestamp: Date.now(),
    };
    setRepairItems(prev => [newRepairItem, ...prev]);

    // 2. Update the main finished goods list using a functional update
    setFinishedGoods(currentFinishedGoods =>
      currentFinishedGoods.map(fg => {
        if (fg.id === good.id) {
          return {
            ...fg,
            inRepairUnitIds: [...(fg.inRepairUnitIds || []), unitId],
          };
        }
        return fg;
      })
    );

    // 3. Update the local state for the modal view using a functional update
    // This prevents race conditions if the user clicks multiple times quickly
    setSelectedGood(currentSelectedGood => {
      if (!currentSelectedGood) return null;
      return {
        ...currentSelectedGood,
        inRepairUnitIds: [...(currentSelectedGood.inRepairUnitIds || []), unitId],
      };
    });
  };

  const generateBatchId = (good: FinishedGood): string => {
    const recipeName = getRecipeName(good.recipeId);
    const namePart = recipeName.substring(0, 6).toUpperCase().padEnd(6, 'X');
    const date = new Date(good.timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const datePart = `${day}${month}${year}`;
    const goodCompletionDate = new Date(good.timestamp);
    const goodsOnSameDay = finishedGoods
      .filter(fg => {
        if (fg.recipeId !== good.recipeId) return false;
        const fgDate = new Date(fg.timestamp);
        return (
          fgDate.getFullYear() === goodCompletionDate.getFullYear() &&
          fgDate.getMonth() === goodCompletionDate.getMonth() &&
          fgDate.getDate() === goodCompletionDate.getDate()
        );
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const index = goodsOnSameDay.findIndex(fg => fg.id === good.id);
    const sequencePart = String(index === -1 ? 1 : index + 1).padStart(3, '0');

    return `${namePart}-${datePart}-${sequencePart}`;
  };
  
  const generateUnitIds = (good: FinishedGood): string[] => {
    const batchId = generateBatchId(good);
    if (good.quantity <= 0) return [];
    
    const ids: string[] = [];
    const padding = String(good.quantity).length;
    for (let i = 1; i <= good.quantity; i++) {
        ids.push(`${batchId}-${String(i).padStart(padding, '0')}`);
    }
    return ids;
  };

  const filteredFinishedGoods = finishedGoods.filter(good => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const recipeName = getRecipeName(good.recipeId).toLowerCase();
    if (recipeName.includes(lowercasedFilter)) return true;

    const unitIds = generateUnitIds(good);
    return unitIds.some(id => id.toLowerCase().includes(lowercasedFilter));
  });
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Finished Goods</h1>
      </div>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
        </div>
        <input 
          type="text" 
          placeholder="Search by Product Name or Unit ID..." 
          className="block w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredFinishedGoods.map(good => {
            const unitIds = generateUnitIds(good);
            const inRepairCount = good.inRepairUnitIds?.length || 0;
            const availableQuantity = good.quantity - inRepairCount;
            const hasRepairedUnits = good.repairedUnitIds && good.repairedUnitIds.length > 0;

            return (
              <div key={good.id} className={`bg-white rounded-lg shadow-md p-5 flex flex-col justify-between hover:shadow-lg transition-shadow ${hasRepairedUnits ? 'bg-green-50 border border-green-200' : ''}`}>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{getRecipeName(good.recipeId)}</h3>
                  <p className="font-bold text-3xl text-green-600 my-2">{availableQuantity} <span className="text-lg">Units</span></p>
                  {inRepairCount > 0 && <p className="text-sm text-red-600 font-semibold my-2">{inRepairCount} unit(s) in repair</p>}
                  
                  <div className="space-y-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-md mt-2">
                     <p><strong className="font-semibold text-gray-800">Quality:</strong> {good.qualityRemarks || 'N/A'}</p>
                     <p><strong className="font-semibold text-gray-800">Delivered To:</strong> {good.deliveredTo || 'In Stock'}</p>
                     <p><strong className="font-semibold text-gray-800">Completed:</strong> {new Date(good.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <div className="flex-grow min-w-0">
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Unit ID</p>
                        <p className="font-mono text-center bg-gray-100 p-2 rounded-md mt-1 text-gray-800 tracking-widest text-sm truncate" title={unitIds[0]}>{unitIds[0] || 'N/A'}</p>
                         {good.quantity > 1 && (
                            <p className="text-xs text-gray-500 text-center mt-1">(+ {good.quantity - 1} more)</p>
                         )}
                    </div>
                    <button 
                      onClick={() => handleOpenDetails(good)} 
                      className="ml-3 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors flex-shrink-0" 
                      title="View Details & Serials"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                </div>
              </div>
            );
        })}
      </div>

      {selectedGood && (
        <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={`Details for Batch: ${generateBatchId(selectedGood)}`} size="lg">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg text-gray-800">{getRecipeName(selectedGood.recipeId)}</h3>
              <p><strong className="font-medium">Total Batch Quantity:</strong> {selectedGood.quantity} units</p>
              <p><strong className="font-medium">Completed:</strong> {new Date(selectedGood.timestamp).toLocaleString()}</p>
              <p><strong className="font-medium">Delivered To:</strong> {selectedGood.deliveredTo || 'In Stock'}</p>
              <p><strong className="font-medium">Quality Remarks:</strong> {selectedGood.qualityRemarks || 'N/A'}</p>
            </div>
            
            <div className="pt-2">
              <h4 className="font-semibold text-md text-gray-800 border-b pb-1 mb-2">Unit IDs ({generateUnitIds(selectedGood).length})</h4>
              <div className="max-h-48 overflow-y-auto pr-2 bg-gray-50 p-2 rounded-md border">
                {generateUnitIds(selectedGood).map(id => {
                  const isInRepair = selectedGood.inRepairUnitIds?.includes(id);
                  const isRepaired = selectedGood.repairedUnitIds?.includes(id);
                  return (
                    <div key={id} className={`flex justify-between items-center p-1 rounded ${isRepaired ? 'bg-green-100' : ''} ${isInRepair ? 'bg-red-100' : ''}`}>
                      <p className="font-mono text-xs text-gray-800">{id}</p>
                      {isInRepair ? (
                          <span className="text-xs font-bold text-red-600 px-2">IN REPAIR</span>
                      ) : (
                          <button onClick={() => handleSendToRepair(selectedGood, id)} title="Send to Repair" className="p-1 text-gray-400 hover:text-red-600 rounded-full">
                            <SpannerIcon className="h-4 w-4" />
                          </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <h4 className="font-semibold text-md text-gray-800 border-b pb-1 mb-2">Consumed Component Serials</h4>
              {selectedGood.consumedSerials && Object.keys(selectedGood.consumedSerials).length > 0 && Object.values(selectedGood.consumedSerials).some(s => s.length > 0) ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {Object.entries(selectedGood.consumedSerials).filter(([,serials]) => serials.length > 0).map(([goodId, serials]) => (
                    <div key={goodId}>
                      <p className="font-medium text-gray-700">{getGoodName(goodId)} ({serials.length})</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mt-1">
                        {serials.map(serial => (
                          <span key={serial} className="text-xs bg-gray-100 font-mono p-1 rounded text-center truncate" title={serial}>{serial}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic py-4 text-center">No serial number information was recorded for this batch.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FinishedGoods;