
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedInvoice } from "../types";

// Read from Vercel env var (injected by vite.config.ts) — no hardcoded fallback
const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
if (!API_KEY) {
  console.error("GEMINI_API_KEY is not configured. Set it in Vercel environment variables.");
}

const invoiceSchema = {
  type: Type.OBJECT,
  properties: {
    document_type: { type: Type.STRING, enum: ["invoice", "receipt", "credit_note", "debit_note", "other"] },
    source_type: { type: Type.STRING, enum: ["sales", "purchase"] },
    issuer_details: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        gstin: { type: Type.STRING },
        address: { type: Type.STRING },
        state: { type: Type.STRING },
        state_code: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        contact_person: { type: Type.STRING },
      },
    },
    receiver_details: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        gstin: { type: Type.STRING },
        address: { type: Type.STRING },
        state: { type: Type.STRING },
        state_code: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        contact_person: { type: Type.STRING },
      },
    },
    invoice_metadata: {
      type: Type.OBJECT,
      properties: {
        invoice_number: { type: Type.STRING },
        invoice_date: { type: Type.STRING },
        due_date: { type: Type.STRING },
        purchase_order_number: { type: Type.STRING },
        ewaybill_number: { type: Type.STRING },
        input_tax_credit: { type: Type.STRING, enum: ["set_off", "non_set_off", "not_applicable"], description: "For purchase invoices, determine if ITC is eligible (set_off) or ineligible (non_set_off). Default to set_off." },
        related_invoice_number: { type: Type.STRING, description: "If document is a credit/debit note, the original invoice number" },
        note_reason: { type: Type.STRING, description: "Reason for credit/debit note" }
      },
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Standardized item name. Include technical specs like 32700 6Ah LFP verbatim." },
          item_type: { type: Type.STRING, description: "Classification: Cell, BMS, Bat-misc. This acts as the Master Item Category." },
          make_model: { type: Type.STRING, description: "Manufacturer Brand Name only (e.g. EVE, Daly, Pulstron)." },
          status: { type: Type.STRING, description: "Condition of the item if explicitly mentioned (e.g. 'Damaged', 'Scrap', 'Return'). Default to 'Not Damaged'." },
          hsn_sac: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit_price: { type: Type.NUMBER },
          taxable_value: { type: Type.NUMBER, description: "Total value BEFORE tax" },
          cgst_rate: { type: Type.NUMBER },
          cgst_amount: { type: Type.NUMBER },
          sgst_rate: { type: Type.NUMBER },
          sgst_amount: { type: Type.NUMBER },
          igst_rate: { type: Type.NUMBER },
          igst_amount: { type: Type.NUMBER },
          total_value: { type: Type.NUMBER, description: "Total value AFTER tax" },
        },
      },
    },
    totals: {
      type: Type.OBJECT,
      properties: {
        subtotal_taxable: { type: Type.NUMBER },
        cgst_total: { type: Type.NUMBER },
        sgst_total: { type: Type.NUMBER },
        igst_total: { type: Type.NUMBER },
        round_off: { type: Type.NUMBER },
        grand_total: { type: Type.NUMBER },
        currency: { type: Type.STRING },
      },
    },
    ocr_confidence_score: { type: Type.NUMBER, description: "A number between 0 and 1 indicating confidence" },
    requires_review: { type: Type.BOOLEAN, description: "True if document is blurry or handwritten" },
  },
};

// Helper function to repair truncated JSON
const repairJSON = (jsonStr: string): string => {
    let inString = false;
    let escaped = false;
    const stack: string[] = [];
    
    for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        
        if (char === '"' && !escaped) {
            inString = !inString;
        } else if (!inString) {
            if (char === '{') stack.push('}');
            else if (char === '[') stack.push(']');
            else if (char === '}' || char === ']') {
                if (stack.length > 0 && stack[stack.length - 1] === char) {
                    stack.pop();
                }
            }
        }
        
        if (char === '\\' && !escaped) escaped = true;
        else escaped = false;
    }
    
    let repaired = jsonStr;
    // If cut off inside a string, close it first
    if (inString) repaired += '"';
    
    // Close all open structures
    while (stack.length > 0) {
        repaired += stack.pop();
    }
    
    return repaired;
};

const cleanAndParseJSON = (raw: string) => {
    let text = raw.trim();
    // Remove markdown code blocks (```json ... ```)
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    
    try {
        return JSON.parse(text);
    } catch (e) {
        // Fallback 1: Attempt to repair truncated JSON
        try {
            const repaired = repairJSON(text);
            return JSON.parse(repaired);
        } catch (e2) {
            // Fallback 2: Try locating the JSON object boundaries (legacy)
            const firstOpen = text.indexOf('{');
            const lastClose = text.lastIndexOf('}');
            
            if (firstOpen !== -1 && lastClose !== -1) {
                const candidate = text.substring(firstOpen, lastClose + 1);
                try {
                    // Try repairing the candidate as well in case it was a partial extract
                    const repairedCandidate = repairJSON(candidate);
                    return JSON.parse(repairedCandidate);
                } catch (e3) {
                    console.error("JSON Parse Recovery Failed. Text:", text);
                    throw e;
                }
            }
            throw e;
        }
    }
};

export const extractInvoiceData = async (
  fileBase64: string,
  mimeType: string,
  filename: string
): Promise<ExtractedInvoice> => {
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        // Prepare Prompt
        const prompt = `Analyze this document. It is likely an Indian GST invoice.
        Extract all fields strictly according to the schema.
        
        GLOBAL RULES:
        1. **EXTRACT ALL ITEMS**: You MUST extract every single line item listed in the document's main table. 
           - Do not summarize. 
           - Do not skip items. 
           - If there are 28 rows, return 28 item objects.
           - Extract items even if they are NOT Cells or BMS (e.g. screws, wires, nickel, transport charges).
        
        2. **TAXATION (IMPORTANT)**:
           - For EACH item, extract 'cgst_rate', 'sgst_rate', 'igst_rate' (percentages) and their amounts.
           - Look for columns like "GST %", "Tax Rate", "CGST Amt", "SGST Amt", "IGST Amt".
           - If only "GST Rate" is given (e.g. 18%) and it's an intra-state transaction, split it (CGST 9%, SGST 9%).
           - If inter-state, put it in IGST (18%).
        
        3. **MASTER ITEM MAPPING / NAMING**:
           - 'item_type': Classify into 'Cell', 'BMS', or 'Bat-misc'.
             - Use 'Bat-misc' for EVERYTHING that is not strictly a Cell or BMS.
           - 'description': Standardize strictly based on 'item_type':
               A. If 'item_type' is 'Cell': Format as "[Size] [Capacity] [Chemistry] [Grade]" (e.g. "32700 6Ah LFP Solar").
               B. If 'item_type' is 'BMS': Format as "[Series]S [Amps]A [Chemistry]" (e.g. "23S 30A LFP").
               C. Otherwise: Use a clear, standardized version of the invoice item description.
           - 'make_model': Extract Brand Name (e.g. 'EVE', 'Daly').
        
        4. **METADATA**:
           - Dates: YYYY-MM-DD.
           - Money: Numbers only (no symbols).
           - Source Type: If issuer is "Datlion Cnergy", 'sales'. If receiver is "Datlion Cnergy", 'purchase'. Default 'purchase'.
           - ITC: Default 'set_off' for purchases unless blocked.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: fileBase64
                }
              },
              { text: prompt }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: invoiceSchema,
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        });

        let text = response.text;
        if (!text) throw new Error("No response from AI");

        const parsedData = cleanAndParseJSON(text);

        return {
          ...parsedData,
          filename,
          timestamp: new Date().toISOString(),
          raw_text: "Stored securely", 
        };
    } catch (error: any) {
        console.error("Gemini Extraction Error:", error);
        let errorMessage = error.message;
        throw new Error(`Gemini Extraction Failed: ${errorMessage}`);
    }
};

export const generateTextResponse = async (prompt: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { 
                temperature: 0.7,
                maxOutputTokens: 2048 
            }
        });
        
        return response.text || "No response generated.";
    } catch (error: any) {
        console.error("Gemini Text Error:", error);
        return `Error: ${error.message}`;
    }
};

const aiAssistantSchema = {
  type: Type.OBJECT,
  properties: {
    document_type: { type: Type.STRING, enum: ["invoice", "po", "quotation", "proforma"] },
    template_name: { type: Type.STRING, nullable: true },
    company_match: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        is_new_company: { type: Type.BOOLEAN }
      }
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit_price: { type: Type.NUMBER },
          is_custom_product: { type: Type.BOOLEAN }
        }
      }
    },
    ui_options: {
      type: Type.OBJECT,
      properties: {
        showReceiverSign: { type: Type.BOOLEAN, nullable: true },
        showQRCode: { type: Type.BOOLEAN, nullable: true },
        showTotalsTable: { type: Type.BOOLEAN, nullable: true },
        showTaxTable: { type: Type.BOOLEAN, nullable: true },
        terms: { type: Type.STRING, nullable: true },
        visibleColumns: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.BOOLEAN, nullable: true },
            description: { type: Type.BOOLEAN, nullable: true },
            hsn: { type: Type.BOOLEAN, nullable: true },
            quantity: { type: Type.BOOLEAN, nullable: true },
            rate: { type: Type.BOOLEAN, nullable: true },
            discount: { type: Type.BOOLEAN, nullable: true },
            taxableValue: { type: Type.BOOLEAN, nullable: true },
            total: { type: Type.BOOLEAN, nullable: true }
          }
        }
      }
    }
  }
};

export const generateInvoiceFromText = async (
    prompt: string, 
    context: {
        companies: string[];
        products: { model_name: string; price_without_gst: number }[];
        templates: string[];
    }
): Promise<any> => {
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        const systemPrompt = `You are an AI Invoice Assistant for the Datlion Cnergy Plant OS. Your job is to translate a user's natural language request into a strict JSON payload that will be used to automatically fill out an Invoice/Quotation form.

You will be provided with the following SYSTEM CONTEXT (data currently in the database):
[COMPANIES]: ${JSON.stringify(context.companies)}
[PRODUCTS]: ${JSON.stringify(context.products)}
[TEMPLATES]: ${JSON.stringify(context.templates)}

Follow these strict rules:

1. **DOCUMENT TYPE**: Extract the document type. Must be one of: 'invoice', 'po', 'quotation', 'proforma'. Default is 'invoice'.
2. **CUSTOMER/COMPANY**: Attempt to match the customer/supplier mentioned by the user to the closest name in the [COMPANIES] list. If found, return the exact matched name. If the user mentions a completely new company, return exactly what the user typed.
3. **LINE ITEMS (PRODUCTS)**:
   - For each product requested, try to match it to the closest product in the [PRODUCTS] list. If a match is found, return the exact model_name and its corresponding price_without_gst as the unit_price.
   - **CUSTOM PRODUCTS**: If the user asks for a product that clearly does NOT exist in the [PRODUCTS] list, DO NOT force a match. Return the custom description exactly as the user requested and set the unit_price based on user input (or 0 if not provided). Set is_custom_product: true.
   - Ensure you parse the requested quantity for each item (default to 1).
4. **TEMPLATE**: If the user requests a specific template (e.g., "use template GST invoices"), match it against the [TEMPLATES] list and return the exact template name.
5. **UI CONFIGURATION OPTIONS**: 
   The system supports the following toggles. If the user explicitly asks to hide or show certain elements, adjust these boolean flags accordingly. If not mentioned, return them as null:
   - showReceiverSign
   - showQRCode
   - showTotalsTable
   - showTaxTable
   - terms (string if they ask to add/edit terms)
   - visibleColumns (index, description, hsn, quantity, rate, discount, taxableValue, total)

User Request: "${prompt}"`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: systemPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: aiAssistantSchema,
                temperature: 0.1,
            },
        });

        let text = response.text;
        if (!text) throw new Error("No response from AI");

        return cleanAndParseJSON(text);
    } catch (error: any) {
        console.error("Gemini AI Assistant Error:", error);
        throw new Error(`AI Assistant Failed: ${error.message}`);
    }
};
