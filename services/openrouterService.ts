import { ExtractedInvoice, EMPTY_INVOICE } from "../types";

// Read from Vercel env var (injected by vite.config.ts)
const DEFAULT_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || "";
const DEFAULT_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";

export const extractInvoiceDataOpenRouter = async (
  fileBase64: string,
  mimeType: string,
  filename: string,
  apiKey?: string,
  model?: string
): Promise<ExtractedInvoice> => {
  const key = apiKey || DEFAULT_API_KEY;
  const modelName = model || DEFAULT_MODEL;

  if (!key) {
    throw new Error("OpenRouter API Key is not configured. Please set it in Vercel environment variables or inside Settings.");
  }

  const prompt = `Analyze this document. It is likely an Indian GST invoice.
Extract all fields strictly in JSON format. Your response MUST be valid JSON only. Do not wrap it in markdown formatting (like \`\`\`json) or include any extra text.

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

Return a JSON object matching this schema exactly:
{
  "document_type": "invoice" | "receipt" | "credit_note" | "debit_note" | "other",
  "source_type": "sales" | "purchase",
  "issuer_details": {
    "name": string,
    "gstin": string,
    "address": string,
    "state": string,
    "state_code": string,
    "email": string,
    "phone": string,
    "contact_person": string
  },
  "receiver_details": {
    "name": string,
    "gstin": string,
    "address": string,
    "state": string,
    "state_code": string,
    "email": string,
    "phone": string,
    "contact_person": string
  },
  "invoice_metadata": {
    "invoice_number": string,
    "invoice_date": string,
    "due_date": string,
    "purchase_order_number": string,
    "ewaybill_number": string,
    "input_tax_credit": "set_off" | "non_set_off" | "not_applicable",
    "related_invoice_number": string,
    "note_reason": string
  },
  "items": [
    {
      "description": string,
      "item_type": "Cell" | "BMS" | "Bat-misc",
      "make_model": string,
      "status": string,
      "hsn_sac": string,
      "quantity": number,
      "unit_price": number,
      "taxable_value": number,
      "cgst_rate": number,
      "cgst_amount": number,
      "sgst_rate": number,
      "sgst_amount": number,
      "igst_rate": number,
      "igst_amount": number,
      "total_value": number
    }
  ],
  "totals": {
    "subtotal_taxable": number,
    "cgst_total": number,
    "sgst_total": number,
    "igst_total": number,
    "round_off": number,
    "grand_total": number,
    "currency": string
  },
  "ocr_confidence_score": number,
  "requires_review": boolean
}
`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
        "X-Title": "Datlion Cnergy Plant OS"
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${fileBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      let errorBody = "";
      try { errorBody = await response.text(); } catch (e) { errorBody = "Unknown error"; }
      throw new Error(`OpenRouter Error (${response.status}): ${response.statusText}. Details: ${errorBody}.`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("OpenRouter model returned empty response");
    }

    const cleanAndParseJSON = (raw: string) => {
      let text = raw.trim();
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
      
      const repairJSON = (jsonStr: string): string => {
        let inString = false;
        let escaped = false;
        const stack: string[] = [];
        
        for (let i = 0; i < jsonStr.length; i++) {
          const char = jsonStr[i];
          if (char === '"' && !escaped) inString = !inString;
          else if (!inString) {
            if (char === '{') stack.push('}');
            else if (char === '[') stack.push(']');
            else if (char === '}' || char === ']') {
              if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
            }
          }
          if (char === '\\' && !escaped) escaped = true; else escaped = false;
        }
        
        let repaired = jsonStr;
        if (inString) repaired += '"';
        while (stack.length > 0) repaired += stack.pop();
        return repaired;
      };

      try {
        return JSON.parse(text);
      } catch (e) {
        try {
          return JSON.parse(repairJSON(text));
        } catch (e2) {
          const firstOpen = text.indexOf('{');
          const lastClose = text.lastIndexOf('}');
          if (firstOpen !== -1 && lastClose !== -1) {
            const candidate = text.substring(firstOpen, lastClose + 1);
            try {
              return JSON.parse(repairJSON(candidate));
            } catch (e3) {
              console.error("OpenRouter JSON Parse Recovery Failed. Text:", text);
              throw e;
            }
          }
          throw e;
        }
      }
    };

    const parsedData = cleanAndParseJSON(rawContent);

    return {
      ...EMPTY_INVOICE,
      ...parsedData,
      filename,
      timestamp: new Date().toISOString(),
      raw_text: `Extracted via OpenRouter (${modelName})`,
      ocr_confidence_score: parsedData.ocr_confidence_score || 0.9,
    };

  } catch (error: any) {
    console.error("OpenRouter Extraction Error:", error);
    throw error;
  }
};

export const testOpenRouterConnection = async (
  apiKey?: string,
  model?: string
): Promise<{ success: boolean; message: string }> => {
  const key = apiKey || DEFAULT_API_KEY;
  const modelName = model || DEFAULT_MODEL;

  if (!key) {
    return { success: false, message: "OpenRouter API Key is not configured." };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true, message: "Connection to OpenRouter successful!" };
    }

    let errorBody = "";
    try { errorBody = await response.text(); } catch (e) { errorBody = ""; }
    return { success: false, message: `Server reached but returned error: ${response.status} ${response.statusText}. ${errorBody}` };
  } catch (error: any) {
    return { success: false, message: `Network error connecting to OpenRouter: ${error.message}` };
  }
};

export const generateTextResponseOpenRouter = async (
  prompt: string,
  apiKey?: string,
  model?: string
): Promise<string> => {
  const key = apiKey || DEFAULT_API_KEY;
  const modelName = model || DEFAULT_MODEL;

  if (!key) {
    throw new Error("OpenRouter API Key is not configured.");
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
      })
    });

    if (!response.ok) {
      let errorBody = "";
      try { errorBody = await response.text(); } catch (e) { errorBody = ""; }
      throw new Error(`OpenRouter Error (${response.status}): ${errorBody || response.statusText}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response.";
  } catch (error: any) {
    console.error("OpenRouter Chat Error:", error);
    throw error;
  }
};
