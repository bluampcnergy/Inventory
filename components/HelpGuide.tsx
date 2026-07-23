import React, { useState, useMemo } from 'react';
import type { View, User } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { CubeIcon } from './icons/CubeIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { BuildingIcon } from './icons/BuildingIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface HelpGuideProps {
  setView: (view: View) => void;
  userRole?: User['role'];
}

interface GuideSection {
  id: string;
  category: 'getting_started' | 'operations' | 'finance' | 'admin' | 'tips';
  title: string;
  subtitle: string;
  icon: string;
  accessRole: string;
  targetView?: View;
  overview: string;
  keyFeatures: string[];
  stepByStep: { step: number; title: string; description: string }[];
  proTips: string[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  // GETTING STARTED
  {
    id: 'overview',
    category: 'getting_started',
    title: 'Application Overview & Navigation',
    subtitle: 'Learn the fundamentals of Datlion Cnergy Plant OS',
    icon: '⚡',
    accessRole: 'All Roles',
    targetView: 'home',
    overview: 'Datlion Cnergy Plant OS is an end-to-end Battery & Energy Storage Assembly Plant Management System. It coordinates raw cell intake, capacity testing, module/pack assembly (WIP), storage layout, sales invoicing, GST returns, and full barcode traceability.',
    keyFeatures: [
      'Top Navigation Bar organized into Home, Operations, Finance, Admin, and Other Links',
      'Real-time Operational & Financial KPI Dashboard',
      'Role-based permissions (Director Admin, Billing & Ops, General Employee)',
      'Local Storage auto-save cache to prevent data loss during page reloads'
    ],
    stepByStep: [
      { step: 1, title: 'Understand Your Role', description: 'Director Admins have full access. Billing & Ops can access Invoices and Expenses without accessing sensitive company financials. General Employees manage factory production.' },
      { step: 2, title: 'Use Sub-Navigation', description: 'Click any main section (e.g. Operations) to reveal its workflow sub-tabs (Raw Materials -> Testing -> WIP -> Finished Goods).' },
      { step: 3, title: 'Access Other Links', description: 'Use the top-right "Other Links" dropdown for quick access to this Help Guide, Support Reports, and Prismatic Data.' }
    ],
    proTips: [
      'Click the Datlion Cnergy logo anytime in the top-left to quickly return to your Home Dashboard.',
      'Your active workspace is preserved in local cache, so refreshing the browser will not erase active drafts.'
    ]
  },
  {
    id: 'roles',
    category: 'getting_started',
    title: 'User Roles & Access Permissions',
    subtitle: 'Understand access rights across Director Admin, Billing & Ops, and General Employee',
    icon: '🛡️',
    accessRole: 'All Roles',
    overview: 'The system strictly enforces Role-Based Access Control (RBAC) to ensure operational data integrity while protecting sensitive financial records.',
    keyFeatures: [
      'Director Admin: Full access to all modules including Finance Dashboards, GST Returns, Price Lists, and User Management.',
      'Billing & Ops: Full access to Invoice Maker & Expense Tracking, with explicit restriction from core financial profit dashboards.',
      'General Employee: Dedicated factory floor access for Raw Materials, Cell Testing, WIP Assembly, Storage, and Supplies.'
    ],
    stepByStep: [
      { step: 1, title: 'Check Your Badge', description: 'Look at the top-right corner of the header. Your role badge (Director Admin, Billing & Ops, or General Employee) is displayed next to your username.' },
      { step: 2, title: 'Restricted Views', description: 'If you attempt to access an Admin-only view without permission, the system will display a friendly "Access Denied" notice.' }
    ],
    proTips: [
      'Only Director Admins can create new user accounts or modify existing role assignments in Admin -> Users.'
    ]
  },

  // OPERATIONS
  {
    id: 'raw_materials',
    category: 'operations',
    title: 'Raw Materials (Inward Inventory)',
    subtitle: 'Log incoming battery cells, BMS units, wires, and hardware batches',
    icon: '📦',
    accessRole: 'All Employees',
    targetView: 'received',
    overview: 'Raw Materials is the entry point for all factory inventory. Every batch of cells or components received from suppliers must be registered here with batch numbers and quantities.',
    keyFeatures: [
      'Register incoming cell batches with supplier profiles and invoice reference numbers',
      'Assign custom batch IDs or auto-generate lot numbers',
      'Filter and search incoming batches by date, supplier, or material type',
      'Directly dispatch batches to Testing or WIP'
    ],
    stepByStep: [
      { step: 1, title: 'Click "Receive New Material"', description: 'Open Operations -> Raw Materials and click the green "Add Received Goods" button.' },
      { step: 2, title: 'Fill Batch Details', description: 'Select the supplier company, enter item description, invoice/bill number, quantity, and unit price.' },
      { step: 3, title: 'Save & Route', description: 'Click Save. The batch is now logged and ready to move to Testing or Production.' }
    ],
    proTips: [
      'Ensure supplier invoice numbers match your physical delivery challans for seamless GST reconciliation.'
    ]
  },
  {
    id: 'testing',
    category: 'operations',
    title: 'Cell Testing & Capacity Grading',
    subtitle: 'Perform internal resistance (IR), capacity, and voltage grading on incoming cells',
    icon: '🧪',
    accessRole: 'All Employees',
    targetView: 'testing',
    overview: 'Before cells are assembled into battery packs in WIP, they undergo strict testing to measure actual capacity (Ah), voltage (V), and Internal Resistance (mΩ).',
    keyFeatures: [
      'Log test results per cell or per batch lot',
      'Grade cells into Capacity Bins (e.g. 100Ah, 105Ah, 120Ah)',
      'Pass/Fail filtering to isolate defective cells before pack assembly',
      'One-click push from Testing to Work in Progress (WIP)'
    ],
    stepByStep: [
      { step: 1, title: 'Select Batch to Test', description: 'Navigate to Operations -> Testing and choose an untested material batch.' },
      { step: 2, title: 'Enter Testing Metrics', description: 'Input tested capacity, IR values, and assign a grade bin.' },
      { step: 3, title: 'Push to Production', description: 'Click "Send to Production" to transfer passed cells straight into WIP assembly.' }
    ],
    proTips: [
      'Group cells with identical IR and capacity bins together to maximize battery pack lifespan and balance.'
    ]
  },
  {
    id: 'wip',
    category: 'operations',
    title: 'Work in Progress (WIP Assembly)',
    subtitle: 'Assemble battery packs, consume Bill of Materials (BOM), and generate serial numbers',
    icon: '⚙️',
    accessRole: 'All Employees',
    targetView: 'wip',
    overview: 'Work in Progress (WIP) is the core manufacturing module. Here, raw cells and components are combined using defined Recipes (BOMs) into finished battery packs.',
    keyFeatures: [
      'Select predefined Battery Recipes (e.g., 48V 100Ah LFP Pack)',
      'Automatic Bill of Materials (BOM) cell consumption from tested inventory',
      'Unique Serial Number / QR code generation for every assembled unit',
      'Defective unit repair tracking and cell dismantling support'
    ],
    stepByStep: [
      { step: 1, title: 'Start Assembly Job', description: 'Go to Operations -> Work in Progress and click "Create New Assembly".' },
      { step: 2, title: 'Select Recipe & Quantity', description: 'Choose the product recipe. The system automatically calculates required cells, BMS, and enclosures.' },
      { step: 3, title: 'Generate Unit Serials', description: 'Confirm assembly to generate unique serial numbers for each pack and move them to Finished Goods.' }
    ],
    proTips: [
      'Use the Serial Number Search in Invoice Maker to quickly lookup and attach pack serial numbers to customer invoices.'
    ]
  },
  {
    id: 'dtf',
    category: 'operations',
    title: 'Direct to Finished (DTF)',
    subtitle: 'Bypass WIP for pre-assembled or traded finished products',
    icon: '⚡',
    accessRole: 'All Employees',
    targetView: 'dtf',
    overview: 'Direct to Finished Goods (DTF) allows fast-tracking items that do not require factory assembly (such as pre-made chargers, standalone BMS, or imported battery packs).',
    keyFeatures: [
      'Direct intake to Finished Goods inventory',
      'Bypasses cell testing and WIP workflow',
      'Instant availability for sales invoicing'
    ],
    stepByStep: [
      { step: 1, title: 'Open DTF Section', description: 'Go to Operations -> Direct to Finished.' },
      { step: 2, title: 'Enter Product Details', description: 'Fill in product name, model, quantity, serial numbers, and cost.' },
      { step: 3, title: 'Post to Inventory', description: 'Click Save to immediately list the items under Finished Goods.' }
    ],
    proTips: ['Use DTF for trading goods or accessories that bypass cell assembly pipelines.']
  },
  {
    id: 'finished',
    category: 'operations',
    title: 'Finished Goods Inventory',
    subtitle: 'Manage completed battery packs, print barcode/QR labels, and process sales dispatches',
    icon: '🔋',
    accessRole: 'All Employees',
    targetView: 'finished',
    overview: 'Finished Goods tracks all ready-to-ship battery packs and products. It provides full serial number tracking, stock levels, and direct link to sales invoicing.',
    keyFeatures: [
      'View stock by battery model, voltage, and capacity',
      'Print QR labels and barcode stickers for physical pack labeling',
      'Dispatch items and automatically generate Sales Invoices'
    ],
    stepByStep: [
      { step: 1, title: 'Browse Available Stock', description: 'Open Operations -> Finished Goods to see ready units.' },
      { step: 2, title: 'Print Labels', description: 'Click the QR/Barcode icon next to any unit to generate printable stickers.' },
      { step: 3, title: 'Dispatch to Customer', description: 'Click "Create Invoice" on any unit to pre-fill the Invoice Maker with product specs and serials.' }
    ],
    proTips: ['Always scan/verify the QR label on physical packs prior to packing for shipment.']
  },
  {
    id: 'storage',
    category: 'operations',
    title: 'Storage Layout & Location Visualizer',
    subtitle: 'Map rooms, warehouse racks, and locate inventory visually',
    icon: '🏛️',
    accessRole: 'All Employees',
    targetView: 'storage',
    overview: 'The Storage Layout manager provides a visual grid of warehouse rooms, racks, and shelves to ensure every cell batch and finished pack has a precise physical location.',
    keyFeatures: [
      'Multi-room warehouse configuration (e.g. Cell Store, Packing Room, Quarantine)',
      'Rack grid layout with shelf and bin identifiers',
      'Visual occupancy indicators'
    ],
    stepByStep: [
      { step: 1, title: 'Open Storage Layout', description: 'Navigate to Operations -> Storage Layout.' },
      { step: 2, title: 'Select Room & Rack', description: 'Click on a room tab to view its rack grid.' },
      { step: 3, title: 'Assign Item to Rack', description: 'Click on any empty rack slot to assign raw materials or finished packs.' }
    ],
    proTips: ['Keeping storage locations updated reduces cell retrieval time during high-volume assembly runs.']
  },
  {
    id: 'supplies',
    category: 'operations',
    title: 'Supplies & Consumables Record',
    subtitle: 'Track operational consumables like nickel strips, insulation tape, wires, and solder',
    icon: '🛠️',
    accessRole: 'All Employees',
    targetView: 'supplies',
    overview: 'Supplies Record tracks non-BOM factory consumables needed for plant maintenance, packaging, and assembly operations.',
    keyFeatures: [
      'Log consumable purchases and current stock levels',
      'Set low-stock reorder thresholds',
      'Track monthly consumable expenditure'
    ],
    stepByStep: [
      { step: 1, title: 'Log Supply Item', description: 'Go to Operations -> Supplies Record and click "Add Supply Item".' },
      { step: 2, title: 'Update Quantities', description: 'Log incoming stock or record daily usage to keep totals accurate.' }
    ],
    proTips: ['Review low-stock alerts weekly to prevent factory downtime caused by missing nickel strips or wires.']
  },

  // FINANCE
  {
    id: 'invoice_maker',
    category: 'finance',
    title: 'Invoice Maker & Document Generator',
    subtitle: 'Create Tax Invoices, Quotations, Purchase Orders, and Proformas with auto-save',
    icon: '📄',
    accessRole: 'Billing & Ops / Admin',
    targetView: 'finance_maker',
    overview: 'The Invoice Maker is a powerful document creation suite supporting GST Tax Invoices, Quotations, Purchase Orders, and Proformas with live photo previews, auto-calculations, and PDF exports.',
    keyFeatures: [
      'Support for 4 Document Types: GST Invoice, Purchase Order (PO), Quotation, Proforma Invoice',
      'Product Photo URL column with live thumbnail preview',
      'Smart Pricing autocomplete synced with Price List',
      'Local Storage auto-save (reloads do not wipe your active draft, logo, or terms)',
      'Single & Dual page PDF print formatting'
    ],
    stepByStep: [
      { step: 1, title: 'Choose Document Type', description: 'Select GST Invoice, PO, Quotation, or Proforma from the top selector.' },
      { step: 2, title: 'Pick Companies', description: 'Select Billed To and Shipped To company profiles from the dropdowns.' },
      { step: 3, title: 'Add Items & Photos', description: 'Add line items. Enable Columns -> Photo to paste image URLs for visual line items.' },
      { step: 4, title: 'Save & Download PDF', description: 'Click "Save to Database" to record the invoice, then click "Print / Download PDF".' }
    ],
    proTips: [
      'Use the "Search Previous Document" bar at the top of Invoice Maker to load and duplicate previous invoices instantly.',
      'Drafts are automatically saved in local cache, so you can safely switch tabs or log out without losing edits.'
    ]
  },
  {
    id: 'scan_invoice',
    category: 'finance',
    title: 'Scan Invoice & AI Document OCR',
    subtitle: 'Upload PDF supplier invoices for automated data extraction',
    icon: '📸',
    accessRole: 'Director Admin',
    targetView: 'finance_upload',
    overview: 'Scan Invoice allows Director Admins to drag-and-drop supplier PDF invoices or receipts. The embedded AI parses line items, HSN codes, tax amounts, and totals automatically.',
    keyFeatures: [
      'AI OCR parsing for PDF and image invoices',
      'Automatic HSN and GST tax extraction',
      'Direct sync into Raw Materials and Expense logs'
    ],
    stepByStep: [
      { step: 1, title: 'Upload File', description: 'Go to Finance -> Scan Invoice and drop your PDF invoice file.' },
      { step: 2, title: 'Review Extraction', description: 'Verify extracted vendor details, line items, and tax amounts.' },
      { step: 3, title: 'Confirm Import', description: 'Click "Approve & Save" to push parsed records directly into inventory.' }
    ],
    proTips: ['Ensure PDF uploads are clear and legible for highest AI extraction accuracy.']
  },
  {
    id: 'gst_returns',
    category: 'finance',
    title: 'GST Returns & Tax Summaries',
    subtitle: 'Generate GSTR-1, GSTR-3B, and HSN tax summary reports',
    icon: '📊',
    accessRole: 'Director Admin',
    targetView: 'finance_gst',
    overview: 'GST Returns automatically calculates monthly/quarterly tax liabilities, output IGST/CGST/SGST collected from sales, and input tax credit (ITC) from purchases.',
    keyFeatures: [
      'GSTR-1 B2B & B2C sales tax summary',
      'GSTR-3B tax payment calculations',
      'HSN-wise summary reports for GST portal filing',
      'CSV export for CA reconciliation'
    ],
    stepByStep: [
      { step: 1, title: 'Select Tax Period', description: 'Navigate to Finance -> GST Returns and select the filing month.' },
      { step: 2, title: 'Review Tax Totals', description: 'Inspect IGST, CGST, and SGST breakdowns across sales and purchases.' },
      { step: 3, title: 'Export Filing Sheet', description: 'Click "Export CSV" to send tax tables directly to your accountant.' }
    ],
    proTips: ['Cross-check HSN totals against Price List HSN codes prior to monthly filing.']
  },
  {
    id: 'expenses',
    category: 'finance',
    title: 'Operational Expenses Tracker',
    subtitle: 'Log daily petty cash, factory utility bills, logistics, and vendor expenses',
    icon: '💸',
    accessRole: 'Billing & Ops / Admin',
    targetView: 'finance_expenses',
    overview: 'Expenses Tracker manages day-to-day operational spend including freight, rent, electricity, factory tools, and staff welfare expenses.',
    keyFeatures: [
      'Categorized expense entry (Logistics, Utilities, Maintenance, Supplies)',
      'Payment method tracking (Bank Transfer, UPI, Cash)',
      'Receipt attachment and vendor tagging'
    ],
    stepByStep: [
      { step: 1, title: 'Click "Add Expense"', description: 'Open Finance -> Expenses and click "Add New Expense".' },
      { step: 2, title: 'Fill Expense Form', description: 'Select expense category, date, vendor, description, and amount.' },
      { step: 3, title: 'Save Expense', description: 'Click Save. The transaction is instantly recorded in financial summaries.' }
    ],
    proTips: ['Tag logistics expenses with customer invoice numbers to calculate net order profitability.']
  },

  // ADMIN & ANALYTICS
  {
    id: 'companies',
    category: 'admin',
    title: 'Company Profiles & Master Directory',
    subtitle: 'Manage client, supplier, and vendor addresses, GSTIN, and bank details',
    icon: '🏢',
    accessRole: 'Director Admin / Billing & Ops',
    targetView: 'companies',
    overview: 'Company Profiles maintains your master database of clients, suppliers, and internal branch offices with full GSTIN, state code, address, and bank info.',
    keyFeatures: [
      'Client, Supplier, and Self-Company categorization',
      'GSTIN validation and auto state-code detection',
      'Bank details (Account No, IFSC, UPI ID) for invoice footers'
    ],
    stepByStep: [
      { step: 1, title: 'Add New Company', description: 'Navigate to Admin -> Companies and click "Add Company".' },
      { step: 2, title: 'Enter Address & GSTIN', description: 'Fill in legal company name, full address, state code, and GSTIN.' },
      { step: 3, title: 'Use in Invoices', description: 'Saved companies automatically appear in Invoice Maker dropdowns.' }
    ],
    proTips: ['Ensure state codes match the first 2 digits of the GSTIN for accurate intra-state vs inter-state GST calculations.']
  },
  {
    id: 'ai_assistant',
    category: 'admin',
    title: 'AI Assistant & Slack Integration',
    subtitle: 'Generate invoices and query plant inventory via Slack or internal AI prompt',
    icon: '✨',
    accessRole: 'All Roles',
    targetView: 'ai_assistant',
    overview: 'The AI Assistant leverages Gemini LLM to parse natural language requests (e.g., "Create a quotation for Acme Corp for 10 units of 48V 100Ah pack") into populated invoice drafts.',
    keyFeatures: [
      'Natural language invoice & quotation creation',
      'Slack Bot integration (post requests in Slack to generate web drafts)',
      'Instant inventory availability lookup'
    ],
    stepByStep: [
      { step: 1, title: 'Open AI Assistant', description: 'Go to Admin -> AI Assistant.' },
      { step: 2, title: 'Type Natural Prompt', description: 'Type your request in plain English or Hindi.' },
      { step: 3, title: 'Apply Payload', description: 'Click "Apply to Invoice Maker" to auto-fill the document form.' }
    ],
    proTips: ['Mention company names and model numbers clearly in prompts for best matching results.']
  },
  {
    id: 'reports',
    category: 'admin',
    title: 'Reports & Analytics Exports',
    subtitle: 'Export comprehensive CSV/Excel reports for stock, production, and logs',
    icon: '📈',
    accessRole: 'All Roles',
    targetView: 'reports',
    overview: 'Reports provides high-level data aggregation and export tools for plant managers, auditors, and executive reviews.',
    keyFeatures: [
      'Stock Valuation & Raw Material inventory reports',
      'WIP & Assembly production metrics',
      'Finished Goods dispatch history',
      'One-click CSV downloads for Excel analysis'
    ],
    stepByStep: [
      { step: 1, title: 'Select Report Type', description: 'Go to Admin -> Reports / Exports.' },
      { step: 2, title: 'Set Date Filters', description: 'Pick start and end dates for your query.' },
      { step: 3, title: 'Download CSV', description: 'Click "Export Report" to download spreadsheet file.' }
    ],
    proTips: ['Schedule weekly exports of Finished Goods stock for physical audit cross-checks.']
  },
  {
    id: 'master_log',
    category: 'admin',
    title: 'Traceability & Audit Logs',
    subtitle: 'Trace cell barcode history from raw intake to final customer pack, plus user audit log',
    icon: '🔍',
    accessRole: 'Director Admin',
    targetView: 'master',
    overview: 'Traceability & Master Logs provides end-to-end lineage tracking. Enter any cell batch or pack serial number to inspect its complete manufacturing timeline.',
    keyFeatures: [
      'Full battery pack birth-certificate lineage',
      'Cell batch to finished pack mapping',
      'System Audit Log tracking user logins, additions, edits, and deletions'
    ],
    stepByStep: [
      { step: 1, title: 'Search Serial Number', description: 'Go to Admin -> Traceability and paste any serial/QR code.' },
      { step: 2, title: 'Inspect Lineage', description: 'View supplier source, testing results, assembly timestamp, and customer invoice.' }
    ],
    proTips: ['Use Traceability during warranty claims to instantly identify cell supplier batches for any returned pack.']
  },

  // EFFICIENT USAGE TIPS
  {
    id: 'pro_tips',
    category: 'tips',
    title: 'Efficient Usage & Power User Tips',
    subtitle: 'Pro shortcuts and habits to maximize factory floor productivity',
    icon: '⚡',
    accessRole: 'All Roles',
    overview: 'Maximize your operational speed by adopting these recommended workflows and system features.',
    keyFeatures: [
      'Barcode Scanner Integration: USB & Bluetooth barcode scanners act as keyboard input in search bars and serial fields.',
      'Local Storage Persistence: Drafts save every 1 second automatically in browser cache.',
      'Product Photo Previews: Paste web image URLs into Invoice Maker line items for visual client proposals.',
      'Browser Tab Management: Right-click "Other Links" to open external portals like Prismatic Data in split view.'
    ],
    stepByStep: [
      { step: 1, title: 'Use Barcode Scanners', description: 'Focus any serial input field and scan the physical QR code on the battery pack.' },
      { step: 2, title: 'Quick Template Loading', description: 'Save your standard T&C and logos as templates in Invoice Maker for 1-click loading.' }
    ],
    proTips: [
      'If you ever lose connection, do not panic — local storage maintains your current invoice edits until cleared manually.'
    ]
  }
];

export const HelpGuide: React.FC<HelpGuideProps> = ({ setView, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string>('overview');

  const filteredSections = useMemo(() => {
    return GUIDE_SECTIONS.filter(section => {
      const matchesCategory = selectedCategory === 'all' || section.category === selectedCategory;
      const query = searchTerm.toLowerCase().trim();
      if (!query) return matchesCategory;

      const matchesText =
        section.title.toLowerCase().includes(query) ||
        section.subtitle.toLowerCase().includes(query) ||
        section.overview.toLowerCase().includes(query) ||
        section.keyFeatures.some(f => f.toLowerCase().includes(query)) ||
        section.stepByStep.some(s => s.title.toLowerCase().includes(query) || s.description.toLowerCase().includes(query));

      return matchesCategory && matchesText;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HERO HEADER */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-850 to-slate-900 border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#8EBF45]/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-[#8EBF45]/20 text-[#8EBF45] border border-[#8EBF45]/30 uppercase tracking-widest mb-3">
                📖 User Onboarding & Knowledge Base
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-brand">
                Datlion Cnergy <span className="text-[#8EBF45]">System Guide</span>
              </h1>
              <p className="mt-2 text-slate-300 text-sm sm:text-base max-w-2xl">
                Master all components of Datlion Cnergy Plant OS. Learn step-by-step factory floor workflows, invoice creation, testing, storage mapping, and power-user shortcuts.
              </p>
            </div>
            
            {/* SEARCH BAR */}
            <div className="w-full md:w-80">
              <div className="relative">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search guide (e.g., Invoice, Testing, Serials)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#8EBF45] focus:ring-1 focus:ring-[#8EBF45] transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CATEGORY NAV TABS */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mt-6 pt-6 border-t border-slate-700/50">
            {[
              { id: 'all', label: 'All Topics', icon: '🌐' },
              { id: 'getting_started', label: 'Getting Started', icon: '🚀' },
              { id: 'operations', label: 'Operations & Workflow', icon: '🏭' },
              { id: 'finance', label: 'Finance & Invoicing', icon: '💰' },
              { id: 'admin', label: 'Admin & Analytics', icon: '⚙️' },
              { id: 'tips', label: 'Pro Tips', icon: '⚡' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 focus:outline-none ${
                  selectedCategory === tab.id
                    ? 'bg-[#8EBF45] text-slate-950 shadow-md scale-105 font-black'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* RESULTS COUNT & FILTER INFO */}
        <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <div>Showing {filteredSections.length} Component Guide{filteredSections.length !== 1 ? 's' : ''}</div>
          {searchTerm && <div>Filter: "{searchTerm}"</div>}
        </div>

        {/* GUIDE CARDS GRID */}
        {filteredSections.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-white">No matching guide topics found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Try searching for keywords like "Invoice", "Testing", "BOM", "Serials", or reset your search filter.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
              className="mt-4 px-4 py-2 text-xs font-bold bg-[#8EBF45] text-slate-950 rounded-lg hover:opacity-90 transition-opacity"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSections.map((section) => {
              const isExpanded = expandedId === section.id;
              return (
                <div
                  key={section.id}
                  className={`bg-slate-800/70 border rounded-2xl overflow-hidden transition-all duration-200 shadow-lg ${
                    isExpanded ? 'border-[#8EBF45]/60 ring-1 ring-[#8EBF45]/30' : 'border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  {/* CARD HEADER */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? '' : section.id)}
                    className="p-5 sm:p-6 cursor-pointer flex items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-800/90 to-slate-850/90 hover:bg-slate-750 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-center text-2xl shadow-inner shrink-0">
                        {section.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-white">{section.title}</h3>
                          <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-slate-900 text-[#8EBF45] border border-[#8EBF45]/30 uppercase tracking-wider">
                            {section.accessRole}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{section.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {section.targetView && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setView(section.targetView!);
                          }}
                          className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-[#8EBF45] text-slate-950 rounded-lg hover:opacity-90 transition-all shadow-md"
                        >
                          Open Module ↗
                        </button>
                      )}
                      <span className="text-slate-400 text-sm font-bold">
                        {isExpanded ? '▲ Hide' : '▼ View Guide'}
                      </span>
                    </div>
                  </div>

                  {/* EXPANDED CONTENT */}
                  {isExpanded && (
                    <div className="p-6 border-t border-slate-700/60 bg-slate-900/40 space-y-6">
                      
                      {/* OVERVIEW */}
                      <div>
                        <h4 className="text-xs font-black text-[#8EBF45] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          📌 Component Overview
                        </h4>
                        <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                          {section.overview}
                        </p>
                      </div>

                      {/* KEY FEATURES */}
                      <div>
                        <h4 className="text-xs font-black text-[#8EBF45] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          ✨ Key Capabilities
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {section.keyFeatures.map((feat, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 bg-slate-800/80 p-3 rounded-lg border border-slate-700/50 text-xs text-slate-200">
                              <span className="text-[#8EBF45] font-bold shrink-0">✓</span>
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* STEP BY STEP GUIDE */}
                      <div>
                        <h4 className="text-xs font-black text-[#8EBF45] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          🛠️ Step-by-Step Usage Method
                        </h4>
                        <div className="space-y-3">
                          {section.stepByStep.map((step) => (
                            <div key={step.step} className="flex items-start gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                              <div className="w-7 h-7 rounded-lg bg-[#8EBF45] text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow">
                                {step.step}
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-white">{step.title}</h5>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{step.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* PRO TIPS */}
                      {section.proTips.length > 0 && (
                        <div className="bg-gradient-to-r from-[#8EBF45]/10 via-slate-800/80 to-slate-800/80 border border-[#8EBF45]/30 rounded-xl p-4">
                          <h4 className="text-xs font-black text-[#8EBF45] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            💡 Power User Tips
                          </h4>
                          <ul className="space-y-1.5">
                            {section.proTips.map((tip, idx) => (
                              <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                                <span className="text-[#8EBF45]">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* MOBILE OPEN MODULE BUTTON */}
                      {section.targetView && (
                        <div className="sm:hidden pt-2">
                          <button
                            onClick={() => setView(section.targetView!)}
                            className="w-full py-2.5 text-xs font-bold bg-[#8EBF45] text-slate-950 rounded-xl hover:opacity-90 transition-all text-center"
                          >
                            Open {section.title} Module ↗
                          </button>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* QUICK EXTERNAL RESOURCES FOOTER */}
        <div className="bg-slate-850 border border-slate-700/60 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white">Need Additional Support or Enterprise Data Export?</h4>
            <p className="text-xs text-slate-400 mt-0.5">Access support reporting portals or explore Prismatic Data analytics directly.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://support.cnergy.co.in/report"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <span>Support Reports</span>
              <span className="text-slate-400">↗</span>
            </a>
            <a
              href="https://prismaticdata.cnergy.co.in"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 text-xs font-bold bg-[#8EBF45]/20 hover:bg-[#8EBF45]/30 text-[#8EBF45] rounded-lg border border-[#8EBF45]/40 transition-colors flex items-center gap-1.5"
            >
              <span>Prismatic Data</span>
              <span className="text-[#8EBF45]">↗</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HelpGuide;
