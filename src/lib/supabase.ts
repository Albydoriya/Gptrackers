import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Database types
interface Database {
  public: {
    Tables: {
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_person: string;
          email: string;
          phone: string;
          address: string;
          rating: number;
          delivery_time: number;
          payment_terms: string;
          is_active: boolean;
          website: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person: string;
          email: string;
          phone: string;
          address: string;
          rating?: number;
          delivery_time?: number;
          payment_terms?: string;
          is_active?: boolean;
          website?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_person?: string;
          email?: string;
          phone?: string;
          address?: string;
          rating?: number;
          delivery_time?: number;
          payment_terms?: string;
          is_active?: boolean;
          website?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      parts: {
        Row: {
          id: string;
          part_number: string;
          name: string;
          description: string;
          category: string;
          specifications: Record<string, any>;
          current_stock: number;
          min_stock: number;
          preferred_suppliers: string[];
          is_archived: boolean;
          created_at: string;
          updated_at: string;
          // New markup columns
          internal_usage_markup_percentage: number;
          wholesale_markup_percentage: number;
          trade_markup_percentage: number;
          retail_markup_percentage: number;
        };
        Insert: {
          id?: string;
          part_number: string;
          name: string;
          description: string;
          category?: string;
          specifications?: Record<string, any>;
          current_stock?: number;
          min_stock?: number;
          preferred_suppliers?: string[];
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
          // New markup columns
          internal_usage_markup_percentage?: number;
          wholesale_markup_percentage?: number;
          trade_markup_percentage?: number;
          retail_markup_percentage?: number;
        };
        Update: {
          id?: string;
          part_number?: string;
          name?: string;
          description?: string;
          category?: string;
          specifications?: Record<string, any>;
          current_stock?: number;
          min_stock?: number;
          preferred_suppliers?: string[];
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
          // New markup columns
          internal_usage_markup_percentage?: number;
          wholesale_markup_percentage?: number;
          trade_markup_percentage?: number;
          retail_markup_percentage?: number;
        };
      };
      part_price_history: {
        Row: {
          id: string;
          part_id: string;
          price: number;
          supplier_name: string;
          quantity: number;
          effective_date: string;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          part_id: string;
          price: number;
          supplier_name: string;
          quantity?: number;
          effective_date?: string;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          part_id?: string;
          price?: number;
          supplier_name?: string;
          quantity?: number;
          effective_date?: string;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'admin' | 'manager' | 'buyer' | 'viewer';
          department: string | null;
          phone: string | null;
          email: string | null;
          preferences: Record<string, any>;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'manager' | 'buyer' | 'viewer';
          department?: string | null;
          phone?: string | null;
          email?: string | null;
          preferences?: Record<string, any>;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'admin' | 'manager' | 'buyer' | 'viewer';
          department?: string | null;
          phone?: string | null;
          email?: string | null;
          preferences?: Record<string, any>;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          supplier_id: string;
          status: 'draft' | 'approved' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled' | 'supplier_quoting' | 'pending_customer_approval';
          priority: 'low' | 'medium' | 'high';
          total_amount: number;
          order_date: string;
          expected_delivery: string | null;
          actual_delivery: string | null;
          notes: string | null;
          shipping_data: Record<string, any>;
          attachments: any[];
          created_by: string | null;
          approved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          supplier_id: string;
          status?: 'draft' | 'approved' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled' | 'supplier_quoting' | 'pending_customer_approval';
          priority?: 'low' | 'medium' | 'high';
          total_amount?: number;
          order_date?: string;
          expected_delivery?: string | null;
          actual_delivery?: string | null;
          notes?: string | null;
          shipping_data?: Record<string, any>;
          attachments?: any[];
          created_by?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          supplier_id?: string;
          status?: 'draft' | 'approved' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled' | 'supplier_quoting' | 'pending_customer_approval';
          priority?: 'low' | 'medium' | 'high';
          total_amount?: number;
          order_date?: string;
          expected_delivery?: string | null;
          actual_delivery?: string | null;
          notes?: string | null;
          shipping_data?: Record<string, any>;
          attachments?: any[];
          created_by?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_parts: {
        Row: {
          id: string;
          order_id: string;
          part_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          part_id: string;
          quantity: number;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          part_id?: string;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
      };
      status_updates: {
        Row: {
          id: string;
          order_id: string;
          old_status: 'draft' | 'approved' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled' | 'supplier_quoting' | 'pending_customer_approval' | null;
          new_status: 'draft' | 'approved' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled' | 'supplier_quoting' | 'pending_customer_approval';
          notes: string | null;
          updated_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          old_status?: 'draft' | 'approved' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled' | 'supplier_quoting' | 'pending_customer_approval' | null;
          new_status: 'draft' | 'approved' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled' | 'supplier_quoting' | 'pending_customer_approval';
          notes?: string | null;
          updated_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          old_status?: 'draft' | 'approved' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled' | 'supplier_quoting' | 'pending_customer_approval' | null;
          new_status?: 'draft' | 'approved' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled' | 'supplier_quoting' | 'pending_customer_approval';
          notes?: string | null;
          updated_by?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'order_status' | 'low_stock' | 'price_change' | 'delivery' | 'approval' | 'system';
          title: string;
          message: string;
          priority: 'low' | 'medium' | 'high';
          is_read: boolean;
          related_id: string | null;
          action_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'order_status' | 'low_stock' | 'price_change' | 'delivery' | 'approval' | 'system';
          title: string;
          message: string;
          priority?: 'low' | 'medium' | 'high';
          is_read?: boolean;
          related_id?: string | null;
          action_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'order_status' | 'low_stock' | 'price_change' | 'delivery' | 'approval' | 'system';
          title?: string;
          message?: string;
          priority?: 'low' | 'medium' | 'high';
          is_read?: boolean;
          related_id?: string | null;
          action_url?: string | null;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          contact_person: string;
          email: string;
          phone: string;
          address: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person: string;
          email: string;
          phone: string;
          address: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_person?: string;
          email?: string;
          phone?: string;
          address?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      quotes: {
        Row: {
          id: string;
          quote_number: string;
          customer_id: string;
          status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted_to_order' | 'expired';
          total_bid_items_cost: number;
          shipping_cost_sea: number;
          shipping_cost_air: number;
          selected_shipping_method: 'sea' | 'air';
          agent_fees: number;
          local_shipping_fees: number;
          subtotal_amount: number;
          gst_amount: number;
          grand_total_amount: number;
          quote_date: string;
          expiry_date: string;
          notes: string | null;
          created_by: string | null;
          converted_to_order_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quote_number?: string;
          customer_id: string;
          status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted_to_order' | 'expired';
          total_bid_items_cost?: number;
          shipping_cost_sea?: number;
          shipping_cost_air?: number;
          selected_shipping_method?: 'sea' | 'air';
          agent_fees?: number;
          local_shipping_fees?: number;
          subtotal_amount?: number;
          gst_amount?: number;
          grand_total_amount?: number;
          quote_date?: string;
          expiry_date: string;
          notes?: string | null;
          created_by?: string | null;
          converted_to_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quote_number?: string;
          customer_id?: string;
          status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted_to_order' | 'expired';
          total_bid_items_cost?: number;
          shipping_cost_sea?: number;
          shipping_cost_air?: number;
          selected_shipping_method?: 'sea' | 'air';
          agent_fees?: number;
          local_shipping_fees?: number;
          subtotal_amount?: number;
          gst_amount?: number;
          grand_total_amount?: number;
          quote_date?: string;
          expiry_date?: string;
          notes?: string | null;
          created_by?: string | null;
          converted_to_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      quote_parts: {
        Row: {
          id: string;
          quote_id: string;
          part_id: string | null;
          custom_part_name: string | null;
          custom_part_description: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          is_custom_part: boolean;
          pricing_tier: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          part_id?: string | null;
          custom_part_name?: string | null;
          custom_part_description?: string | null;
          quantity: number;
          unit_price: number;
          is_custom_part?: boolean;
          pricing_tier?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          part_id?: string | null;
          custom_part_name?: string | null;
          custom_part_description?: string | null;
          quantity?: number;
          unit_price?: number;
          is_custom_part?: boolean;
          pricing_tier?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      order_status: 'draft' | 'approved' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled' | 'supplier_quoting' | 'pending_customer_approval';
      priority_level: 'low' | 'medium' | 'high';
      notification_type: 'order_status' | 'low_stock' | 'price_change' | 'delivery' | 'approval' | 'system';
      user_role: 'admin' | 'manager' | 'buyer' | 'viewer';
      quote_status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted_to_order' | 'expired';
    };
  };
}