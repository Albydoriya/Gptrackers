import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExchangeRateResponse {
  success: boolean;
  rate?: number;
  source?: string;
  error?: string;
  timestamp?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const baseCurrency = "AUD";
    const targetCurrency = "JPY";
    let rate: number | null = null;
    let sourceApi = "frankfurter";

    try {
      const response = await fetch(
        `https://api.frankfurter.app/latest?from=${baseCurrency}&to=${targetCurrency}`
      );

      if (response.ok) {
        const data = await response.json();
        rate = data.rates?.[targetCurrency];

        if (typeof rate !== "number") {
          throw new Error("Invalid rate data from Frankfurter API");
        }
      } else {
        throw new Error(`Frankfurter API returned status ${response.status}`);
      }
    } catch (primaryError) {
      console.error("Frankfurter API failed, trying fallback:", primaryError);

      try {
        const fallbackResponse = await fetch(
          `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          rate = fallbackData.rates?.[targetCurrency];
          sourceApi = "exchangerate-api";

          if (typeof rate !== "number") {
            throw new Error("Invalid rate data from fallback API");
          }
        } else {
          throw new Error("Fallback API also failed");
        }
      } catch (fallbackError) {
        console.error("Both APIs failed:", fallbackError);
        throw new Error("Unable to fetch exchange rate from any source");
      }
    }

    if (rate === null) {
      throw new Error("Failed to obtain exchange rate");
    }

    const { error: insertError } = await supabase
      .from("exchange_rates")
      .insert({
        base_currency: baseCurrency,
        target_currency: targetCurrency,
        rate: rate,
        fetched_at: new Date().toISOString(),
        source_api: sourceApi,
      });

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error(`Failed to save rate to database: ${insertError.message}`);
    }

    const responseData: ExchangeRateResponse = {
      success: true,
      rate: rate,
      source: sourceApi,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in update-exchange-rate function:", error);

    const errorResponse: ExchangeRateResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
