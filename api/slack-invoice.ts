import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://bfkxdpripwjxenfvwpfu.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.warn('Supabase key missing in API route');
}

const supabase = createClient(supabaseUrl, supabaseKey!);

const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

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

function cleanAndParseJSON(raw: string) {
    let text = raw.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    return JSON.parse(text);
}

export default async function handler(req: any, res: any) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Slack sends verification challenge
    if (req.body.type === 'url_verification') {
      return res.status(200).json({ challenge: req.body.challenge });
    }

    // Parse Slack Event API structure or plain slash command
    let userText = '';
    
    if (req.body.event && req.body.event.type === 'message') {
      // Ignore bot messages
      if (req.body.event.bot_id) {
        return res.status(200).send('OK');
      }
      userText = req.body.event.text;
    } else if (req.body.text) {
      // Slash command
      userText = req.body.text;
    } else {
      userText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    if (!userText) {
      return res.status(200).send('No text provided');
    }

    // 1. Fetch context data from Supabase
    const [{ data: companyData }, { data: priceData }, { data: templateData }] = await Promise.all([
      supabase.from('companies').select('name'),
      supabase.from('price_list').select('model_name, price_without_gst'),
      supabase.from('invoice_templates').select('name')
    ]);

    const context = {
      companies: (companyData || []).map((c: any) => c.name),
      products: (priceData || []).map((p: any) => ({ model_name: p.model_name, price_without_gst: p.price_without_gst })),
      templates: (templateData || []).map((t: any) => t.name)
    };

    // 2. Call Gemini
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

User Request: "${userText}"`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: systemPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: aiAssistantSchema,
            temperature: 0.1,
        },
    });

    const parsedData = cleanAndParseJSON(response.text || '{}');

    // 3. Save as a "pending review" invoice so it can be opened via a link
    // We construct a basic ExtractedInvoice structure to store in DB
    const draftPayload = {
      filename: 'AI_Assistant_Draft',
      document_type: 'generated_invoice',
      source_type: 'sales',
      requires_review: true,
      raw_text: 'Generated by AI Assistant via Slack',
      uploaded_by: 'slack_bot',
      invoice_metadata: {
        invoice_number: `SLACK-${Math.floor(Math.random() * 10000)}`,
        ui_config: {},
        slack_ai_payload: parsedData // Storing the parsed data so the frontend can read it and hydrate
      },
      items: [], // the frontend will hydrate this
      totals: { subtotal_taxable: 0, cgst_total: 0, sgst_total: 0, igst_total: 0, grand_total: 0 }
    };

    const { data: dbRecord, error } = await supabase.from('invoices').insert([draftPayload]).select().single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // 4. Send the link back to Slack
    const appUrl = process.env.VITE_APP_URL || 'https://dc-inventory-190526.vercel.app';
    const invoiceUrl = `${appUrl}?view=finance_upload`; // This triggers the module, which fetches pending invoices automatically

    const slackResponse = {
      response_type: "in_channel",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Invoice Draft Generated!*\nI've created an invoice draft based on your request.\n\n*Document Type:* ${parsedData.document_type}\n*Customer:* ${parsedData.company_match?.name || 'Not specified'}\n*Items:* ${parsedData.items?.length || 0} items added.`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Open Invoice Maker",
                emoji: true
              },
              value: "open_invoice",
              url: invoiceUrl,
              style: "primary"
            }
          ]
        }
      ]
    };

    // If it's an Event API request, we need to POST back to the response_url or Slack Web API
    // but for simple slash commands, returning the JSON is enough.
    // Assuming simple webhook / slash command format:
    return res.status(200).json(slackResponse);

  } catch (err: any) {
    console.error('Slack AI Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
