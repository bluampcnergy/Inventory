import React, { useState, useMemo } from 'react';
import type { WIPItem, Recipe, ReceivedGood, FinishedGood, RepairItem } from '../types';
import Modal from './Modal';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { SpannerIcon } from './icons/SpannerIcon';

interface WorkInProgressProps {
  wipItems: WIPItem[];
  setWipItems: React.Dispatch<React.SetStateAction<WIPItem[]>>;
  receivedGoods: ReceivedGood[];
  setReceivedGoods: React.Dispatch<React.SetStateAction<ReceivedGood[]>>;
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  setFinishedGoods: React.Dispatch<React.SetStateAction<FinishedGood[]>>;
  repairItems: RepairItem[];
  setRepairItems: React.Dispatch<React.SetStateAction<RepairItem[]>>;
  finishedGoods: FinishedGood[];
  addLogEntry: (action: string, details: string) => void;
}

const WorkInProgress: React.FC<WorkInProgressProps> = ({ wipItems, setWipItems, receivedGoods, setReceivedGoods, recipes, setRecipes, setFinishedGoods, repairItems, setRepairItems, finishedGoods, addLogEntry }) => {
  const [isWipModalOpen, setWipModalOpen] = useState(false);
  const [isRecipeModalOpen, setRecipeModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  
  const [selectedRecipe, setSelectedRecipe] = useState<string>(recipes[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [consumedSerials, setConsumedSerials] = useState<{ [receivedGoodId: string]: string[] }>({});
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeComponents, setNewRecipeComponents] = useState<{ receivedGoodId: string; quantityPerUnit: number }[]>([{ receivedGoodId: '', quantityPerUnit: 1 }]);

  const [itemToFinish, setItemToFinish] = useState<WIPItem | null>(null);
  const [finishFormData, setFinishFormData] = useState({ qualityRemarks: '', deliveredTo: '' });

  const handleOpenWipModal = () => {
    setSelectedRecipe(recipes[0]?.id || '');
    setQuantity(1);
    setConsumedSerials({});
    setError('');
    setWipModalOpen(true);
  };
  
  const handleConsumedSerialsChange = (goodId: string, serialsText: string) => {
    const serials = serialsText.split('\n').map(s => s.trim()).filter(Boolean);
    setConsumedSerials(prev => ({ ...prev, [goodId]: serials }));
  };

  const handleStartWip = () => {
    setError('');
    const recipe = recipes.find(r => r.id === selectedRecipe);
    if (!recipe) {
      setError('Selected recipe not found.');
      return;
    }

    const stockChecks = recipe.components.map(comp => {
      const stockItem = receivedGoods.find(g => g.id === comp.receivedGoodId);
      const required = comp.quantityPerUnit * quantity;
      return {
        ...comp,
        stockItem,
        required,
        sufficient: stockItem && stockItem.quantity >= required,
      };
    });

    const insufficientStock = stockChecks.find(check => !check.sufficient);
    if (insufficientStock) {
      const stockItemName = insufficientStock.stockItem?.name || `ID: ${insufficientStock.receivedGoodId}`;
      setError(`Insufficient stock for ${stockItemName}. Required: ${insufficientStock.required}, Available: ${insufficientStock.stockItem?.quantity || 0}.`);
      return;
    }

    // Serial number validation
    let serialsValid = true;
    for (const check of stockChecks) {
      if (check.stockItem && check.stockItem.serials.length > 0) {
        const requiredSerialsCount = check.required;
        const enteredSerials = consumedSerials[check.receivedGoodId] || [];
        if (enteredSerials.length !== requiredSerialsCount) {
          setError(`Please enter exactly ${requiredSerialsCount} serial numbers for ${check.stockItem.name}.`);
          serialsValid = false;
          break;
        }
        const availableSerials = new Set(check.stockItem.serials);
        const invalidSerial = enteredSerials.find(s => !availableSerials.has(s));
        if (invalidSerial) {
            setError(`Serial number "${invalidSerial}" for ${check.stockItem.name} is not available in stock.`);
            serialsValid = false;
            break;
        }
        const duplicateSerials = enteredSerials.filter((s, i) => enteredSerials.indexOf(s) !== i);
        if(duplicateSerials.length > 0){
            setError(`Duplicate serial number entered for ${check.stockItem.name}: ${duplicateSerials[0]}`);
            serialsValid = false;
            break;
        }
      }
    }
    if (!serialsValid) return;

    addLogEntry('Started Production', `Started production of ${quantity} units of '${recipe.name}'.`);

    const newReceivedGoods = [...receivedGoods];
    stockChecks.forEach(check => {
      const stockItemIndex = newReceivedGoods.findIndex(g => g.id === check.receivedGoodId);
      if (stockItemIndex > -1) {
        newReceivedGoods[stockItemIndex].quantity -= check.required;

        const enteredSerials = consumedSerials[check.receivedGoodId];
        if (enteredSerials && enteredSerials.length > 0) {
          const originalSerials = newReceivedGoods[stockItemIndex].serials;
          newReceivedGoods[stockItemIndex].serials = originalSerials.filter(s => !enteredSerials.includes(s));
        }
      }
    });

    setReceivedGoods(newReceivedGoods);
    const newWipItem: WIPItem = {
      id: `wip-${Date.now()}`,
      recipeId: recipe.id,
      quantity,
      timestamp: Date.now(),
      consumedSerials,
    };
    setWipItems(prev => [newWipItem, ...prev]);
    setWipModalOpen(false);
  };

  const handleSaveRecipe = () => {
    const newRecipe: Recipe = {
      id: `recipe-${Date.now()}`,
      name: newRecipeName,
      components: newRecipeComponents.filter(c => c.receivedGoodId),
    };
    setRecipes(prev => [...prev, newRecipe]);
    setRecipeModalOpen(false);
    setNewRecipeName('');
    setNewRecipeComponents([{ receivedGoodId: '', quantityPerUnit: 1 }]);
  };

  const handleAddComponent = () => {
    setNewRecipeComponents([...newRecipeComponents, { receivedGoodId: '', quantityPerUnit: 1 }]);
  };
  
  const handleComponentChange = (index: number, field: string, value: string) => {
    const updated = [...newRecipeComponents];
    updated[index] = { ...updated[index], [field]: field === 'quantityPerUnit' ? Number(value) : value };
    setNewRecipeComponents(updated);
  };
  
  const handleRemoveComponent = (index: number) => {
    setNewRecipeComponents(newRecipeComponents.filter((_, i) => i !== index));
  }
  
  const openFinishModal = (wipItem: WIPItem) => {
    setItemToFinish(wipItem);
    setIsFinishModalOpen(true);
  };
  
  const handleFinishProduction = () => {
    if(!itemToFinish) return;

    addLogEntry('Finished Production', `Moved ${itemToFinish.quantity} units of '${getRecipeName(itemToFinish.recipeId)}' to Finished Goods.`);

    const newFinishedGood: FinishedGood = {
      id: `fin-${Date.now()}`,
      recipeId: itemToFinish.recipeId,
      quantity: itemToFinish.quantity,
      timestamp: Date.now(),
      consumedSerials: itemToFinish.consumedSerials,
      ...finishFormData,
      inRepairUnitIds: [],
      repairedUnitIds: [],
    };
    
    setFinishedGoods(prev => [newFinishedGood, ...prev]);
    setWipItems(prev => prev.filter(item => item.id !== itemToFinish.id));
    
    setIsFinishModalOpen(false);
    setItemToFinish(null);
    setFinishFormData({ qualityRemarks: '', deliveredTo: '' });
  };
  
  const handleMarkAsRepaired = (repairItem: RepairItem) => {
    // 1. Find the original FinishedGood
    const originalGoodIndex = finishedGoods.findIndex(fg => fg.id === repairItem.finishedGoodId);
    if (originalGoodIndex === -1) return;
    
    addLogEntry('Item Repaired', `Marked unit '${repairItem.unitId}' of '${getRecipeName(repairItem.recipeId)}' as repaired.`);

    // 2. Update the FinishedGood item
    const updatedFinishedGoods = [...finishedGoods];
    const originalGood = updatedFinishedGoods[originalGoodIndex];
    
    const updatedGood = {
        ...originalGood,
        inRepairUnitIds: (originalGood.inRepairUnitIds || []).filter(id => id !== repairItem.unitId),
        repairedUnitIds: [...(originalGood.repairedUnitIds || []), repairItem.unitId],
    };
    updatedFinishedGoods[originalGoodIndex] = updatedGood;
    setFinishedGoods(updatedFinishedGoods);

    // 3. Remove the item from repairItems
    setRepairItems(prev => prev.filter(item => item.id !== repairItem.id));
  };

  const getRecipeName = (id: string) => recipes.find(r => r.id === id)?.name || 'Unknown Recipe';
  const getGoodName = (id:string) => receivedGoods.find(g => g.id === id)?.name || 'Unknown Item';

  const componentsForModal = useMemo(() => {
    const recipe = recipes.find(r => r.id === selectedRecipe);
    if (!recipe) return [];
    
    return recipe.components.map(comp => {
        const good = receivedGoods.find(g => g.id === comp.receivedGoodId);
        return {
            ...comp,
            goodName: good?.name || 'Unknown',
            hasSerials: good && good.serials.length > 0,
            requiredSerialsCount: comp.quantityPerUnit * quantity
        };
    }).filter(c => c.hasSerials);
  }, [selectedRecipe, quantity, recipes, receivedGoods]);

  const filteredWipItems = wipItems.filter(item => 
    getRecipeName(item.recipeId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Work-in-Progress</h1>
        <div className="flex space-x-2">
            <button onClick={() => setRecipeModalOpen(true)} className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-700 transition-colors">
              <PlusIcon /> <span className="ml-2">Manage Recipes</span>
            </button>
            <button onClick={handleOpenWipModal} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors">
              <PlusIcon /> <span className="ml-2">Start Production</span>
            </button>
        </div>
      </div>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
        </div>
        <input 
          type="text" 
          placeholder="Search by Product Recipe..." 
          className="block w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredWipItems.map(item => (
          <div key={item.id} className="bg-white rounded-lg shadow-md p-5 flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div>
              <h3 className="font-bold text-lg text-gray-900">{getRecipeName(item.recipeId)}</h3>
              <p className="font-bold text-3xl text-blue-600 my-4">{item.quantity} <span className="text-lg">Units</span></p>
              <p className="text-sm text-gray-500">Started: {new Date(item.timestamp).toLocaleDateString()}</p>
            </div>
             <div className="mt-4 flex items-center justify-end">
                <button onClick={() => openFinishModal(item)} className="flex items-center bg-green-500 text-white px-3 py-1 rounded-lg shadow-sm hover:bg-green-600 transition-colors text-sm font-semibold">
                  Mark as Finished <ArrowRightIcon />
                </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Repair Section */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Items in Repair</h2>
        {repairItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {repairItems.map(item => (
                <div key={item.id} className="bg-red-50 border border-red-200 rounded-lg shadow-md p-5 flex flex-col justify-between">
                <div>
                    <h3 className="font-bold text-lg text-red-900">{getRecipeName(item.recipeId)}</h3>
                    <p className="text-sm font-mono bg-red-100 p-2 rounded my-2 text-red-800 break-all">{item.unitId}</p>
                    <p className="text-sm text-gray-500">Sent for repair: {new Date(item.timestamp).toLocaleDateString()}</p>
                </div>
                <div className="mt-4 flex items-center justify-end">
                    <button onClick={() => handleMarkAsRepaired(item)} className="flex items-center bg-green-500 text-white px-3 py-1 rounded-lg shadow-sm hover:bg-green-600 transition-colors text-sm font-semibold">
                        Repaired <SpannerIcon className="ml-1 h-4 w-4" />
                    </button>
                </div>
                </div>
            ))}
            </div>
        ) : (
            <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <p className="text-gray-500">No items currently in repair.</p>
            </div>
        )}
      </div>


      {/* Start Production Modal */}
      <Modal isOpen={isWipModalOpen} onClose={() => setWipModalOpen(false)} title="Start New Production" size="lg">
        <div className="space-y-4">
          {error && <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700">Product Recipe</label>
            <select value={selectedRecipe} onChange={e => setSelectedRecipe(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
              {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity to Produce</label>
            <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min="1" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>

          {componentsForModal.length > 0 && (
            <div className="pt-4 mt-4 border-t">
              <h4 className="text-md font-semibold text-gray-800 mb-2">Consumed Serial Numbers</h4>
              <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                {componentsForModal.map(comp => {
                  const enteredCount = consumedSerials[comp.receivedGoodId]?.length || 0;
                  return (
                    <div key={comp.receivedGoodId}>
                      <label className="block text-sm font-medium text-gray-700">{comp.goodName}</label>
                      <p className="text-xs text-gray-500 mb-1">Enter {comp.requiredSerialsCount} serial numbers, one per line.</p>
                      <textarea 
                        rows={Math.min(10, Math.max(4, comp.requiredSerialsCount))} 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-xs"
                        onChange={(e) => handleConsumedSerialsChange(comp.receivedGoodId, e.target.value)}
                        placeholder={`SN-001\nSN-002\nSN-003...`}
                      />
                      <p className={`text-xs text-right mt-1 font-medium ${enteredCount === comp.requiredSerialsCount ? 'text-green-600' : 'text-red-600'}`}>
                        {enteredCount} / {comp.requiredSerialsCount} entered
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button onClick={handleStartWip} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Confirm & Deduct Stock</button>
          </div>
        </div>
      </Modal>

      {/* Manage Recipes Modal */}
      <Modal isOpen={isRecipeModalOpen} onClose={() => setRecipeModalOpen(false)} title="Manage Recipes" size="lg">
        <div className="space-y-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Create New Recipe</h3>
             <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700">Recipe Name</label><input type="text" value={newRecipeName} onChange={e => setNewRecipeName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" /></div>
                <h4 className="text-md font-semibold text-gray-800">Components</h4>
                {newRecipeComponents.map((comp, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                    <select value={comp.receivedGoodId} onChange={e => handleComponentChange(index, 'receivedGoodId', e.target.value)} className="block w-2/3 border border-gray-300 rounded-md shadow-sm p-2 bg-white">
                      <option value="">Select Raw Material</option>
                      {receivedGoods.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <input type="number" placeholder="Qty" value={comp.quantityPerUnit} onChange={e => handleComponentChange(index, 'quantityPerUnit', e.target.value)} min="1" className="block w-1/3 border border-gray-300 rounded-md shadow-sm p-2"/>
                    <button onClick={() => handleRemoveComponent(index)} className="p-2 text-gray-400 hover:text-red-600"><TrashIcon /></button>
                  </div>
                ))}
                <button onClick={handleAddComponent} className="text-blue-600 text-sm font-medium">+ Add Component</button>
             </div>
             <div className="flex justify-end pt-4">
                <button onClick={handleSaveRecipe} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save Recipe</button>
             </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Existing Recipes</h3>
            <ul className="space-y-2">
              {recipes.map(r => (
                <li key={r.id} className="p-3 bg-white border rounded-md">
                  <p className="font-semibold">{r.name}</p>
                  <ul className="list-disc pl-5 mt-1 text-sm text-gray-600">
                    {r.components.map((c, i) => <li key={i}>{getGoodName(c.receivedGoodId)}: {c.quantityPerUnit} unit(s)</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>

      {/* Finish Production Modal */}
      {itemToFinish && <Modal isOpen={isFinishModalOpen} onClose={() => setIsFinishModalOpen(false)} title={`Complete Production: ${getRecipeName(itemToFinish.recipeId)}`}>
        <div className="space-y-4">
          <p>You are moving <strong>{itemToFinish.quantity} units</strong> to Finished Goods.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700">Quality Remarks</label>
            <textarea value={finishFormData.qualityRemarks} onChange={e => setFinishFormData(p => ({...p, qualityRemarks: e.target.value}))} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Delivered To Company (Optional)</label>
            <input type="text" value={finishFormData.deliveredTo} onChange={e => setFinishFormData(p => ({...p, deliveredTo: e.target.value}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div className="flex justify-end pt-4">
            <button onClick={handleFinishProduction} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Move to Finished Goods</button>
          </div>
        </div>
      </Modal>}

    </div>
  );
};

export default WorkInProgress;