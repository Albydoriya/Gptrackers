import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.1";
import type { ExportRequest, OrderExportData, MultiOrderExportData, ExportResponse } from "./types.ts";
import { MAX_ORDERS_PER_EXPORT } from "./types.ts";
import { generateExcelFile } from "./excelGenerator.ts";
import { generateFileName, generateMultiOrderFileName } from "./utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function handleMultiOrderExport(
  supabase: any,
  user: any,
  orderIds: string[],
  requestedTemplateType?: string
): Promise<Response> {
  if (orderIds.length > MAX_ORDERS_PER_EXPORT) {
    return new Response(
      JSON.stringify({ error: `Maximum ${MAX_ORDERS_PER_EXPORT} orders can be combined in one export` }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const ordersData = await Promise.all(
    orderIds.map(async (orderId) => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_date,
          expected_delivery,
          notes,
          priority,
          status,
          supplier_id,
          supplier:suppliers(
            id,
            name,
            contact_person,
            email,
            phone,
            address,
            payment_terms,
            logo_url,
            export_template_type,
            template_config
          ),
          order_parts(
            id,
            quantity,
            unit_price,
            part:parts(
              id,
              part_number,
              name,
              description,
              specifications
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error || !data) {
        throw new Error(`Order ${orderId} not found`);
      }

      if (!data.supplier) {
        throw new Error(`Order ${orderId} has no supplier assigned`);
      }

      if (!data.order_parts || data.order_parts.length === 0) {
        throw new Error(`Order ${orderId} has no parts`);
      }

      return data;
    })
  );

  const supplierIds = new Set(ordersData.map((order) => order.supplier_id));
  if (supplierIds.size > 1) {
    return new Response(
      JSON.stringify({ error: 'All orders in a batch must belong to the same supplier' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const firstOrder = ordersData[0];
  const multiOrderData: MultiOrderExportData = {
    supplier: {
      id: firstOrder.supplier.id,
      name: firstOrder.supplier.name,
      contact_person: firstOrder.supplier.contact_person,
      email: firstOrder.supplier.email,
      phone: firstOrder.supplier.phone,
      address: firstOrder.supplier.address,
      payment_terms: firstOrder.supplier.payment_terms,
      logo_url: firstOrder.supplier.logo_url,
      export_template_type: firstOrder.supplier.export_template_type,
      template_config: firstOrder.supplier.template_config,
    },
    orders: ordersData.map((orderData) => ({
      order: {
        id: orderData.id,
        order_number: orderData.order_number,
        order_date: orderData.order_date,
        expected_delivery: orderData.expected_delivery,
        notes: orderData.notes,
        priority: orderData.priority,
        status: orderData.status,
      },
      parts: orderData.order_parts.map((op: any) => ({
        id: op.id,
        part_number: op.part.part_number,
        name: op.part.name,
        description: op.part.description,
        specifications: op.part.specifications || {},
        quantity: op.quantity,
        unit_price: op.unit_price,
      })),
    })),
  };

  const templateType = multiOrderData.supplier.export_template_type || requestedTemplateType || 'generic';
  console.log('Generating multi-order Excel file for', orderIds.length, 'orders using template:', templateType);

  const excelBuffer = await generateExcelFile(multiOrderData, templateType);
  const fileName = generateMultiOrderFileName(
    multiOrderData.supplier.name,
    multiOrderData.orders.map(o => o.order.order_number),
    multiOrderData.orders.map(o => o.order.order_date)
  );

  for (const orderId of orderIds) {
    const { error: historyError } = await supabase
      .from('order_export_history')
      .insert({
        order_id: orderId,
        export_type: `${templateType}_multi_supplier_template`,
        exported_by: user.id,
        file_name: fileName,
      });

    if (historyError) {
      console.error('Failed to log export history for order', orderId, ':', historyError);
    }
  }

  return new Response(excelBuffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'manager', 'buyer'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody: ExportRequest = await req.json();
    const { orderId, orderIds, templateType: requestedTemplateType } = requestBody;

    if (!orderId && (!orderIds || orderIds.length === 0)) {
      return new Response(JSON.stringify({ error: 'Order ID or Order IDs array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (orderIds && orderIds.length > 0) {
      return await handleMultiOrderExport(supabase, user, orderIds, requestedTemplateType);
    }

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_date,
        expected_delivery,
        notes,
        priority,
        status,
        supplier:suppliers(
          id,
          name,
          contact_person,
          email,
          phone,
          address,
          payment_terms,
          logo_url,
          export_template_type,
          template_config
        ),
        order_parts(
          id,
          quantity,
          unit_price,
          part:parts(
            id,
            part_number,
            name,
            description,
            specifications
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      console.error('Order fetch error:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!orderData.supplier) {
      return new Response(JSON.stringify({ error: 'Order has no supplier assigned' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!orderData.order_parts || orderData.order_parts.length === 0) {
      return new Response(JSON.stringify({ error: 'Order has no parts' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const exportData: OrderExportData = {
      order: {
        id: orderData.id,
        order_number: orderData.order_number,
        order_date: orderData.order_date,
        expected_delivery: orderData.expected_delivery,
        notes: orderData.notes,
        priority: orderData.priority,
        status: orderData.status,
      },
      supplier: {
        id: orderData.supplier.id,
        name: orderData.supplier.name,
        contact_person: orderData.supplier.contact_person,
        email: orderData.supplier.email,
        phone: orderData.supplier.phone,
        address: orderData.supplier.address,
        payment_terms: orderData.supplier.payment_terms,
        logo_url: orderData.supplier.logo_url,
        export_template_type: orderData.supplier.export_template_type,
        template_config: orderData.supplier.template_config,
      },
      parts: orderData.order_parts.map((op: any) => ({
        id: op.id,
        part_number: op.part.part_number,
        name: op.part.name,
        description: op.part.description,
        specifications: op.part.specifications || {},
        quantity: op.quantity,
        unit_price: op.unit_price,
      })),
    };

    const templateType = exportData.supplier.export_template_type || requestedTemplateType || 'generic';
    console.log('Generating Excel file for order:', orderId, 'using template:', templateType);

    const excelBuffer = await generateExcelFile(exportData, templateType);
    const fileName = generateFileName(exportData.supplier.name, exportData.order.order_number);

    const { error: historyError } = await supabase
      .from('order_export_history')
      .insert({
        order_id: orderId,
        export_type: `${templateType}_supplier_template`,
        exported_by: user.id,
        file_name: fileName,
      });

    if (historyError) {
      console.error('Failed to log export history:', historyError);
    }

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Error in export-order-template function:', error);

    const errorResponse: ExportResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});