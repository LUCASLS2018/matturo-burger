export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      matturo_courier_availability: {
        Row: {
          created_at: string
          revision: number
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          revision?: number
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          revision?: number
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_courier_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "matturo_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_deliveries: {
        Row: {
          completed_at: string | null
          confirmed_at: string
          courier_id: string | null
          created_at: string
          destination: string
          destination_lat: number
          destination_lng: number
          id: string
          order_id: string | null
          reference: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          confirmed_at?: string
          courier_id?: string | null
          created_at?: string
          destination: string
          destination_lat: number
          destination_lng: number
          id?: string
          order_id?: string | null
          reference: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          confirmed_at?: string
          courier_id?: string | null
          created_at?: string
          destination?: string
          destination_lat?: number
          destination_lng?: number
          id?: string
          order_id?: string | null
          reference?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_deliveries_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "matturo_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matturo_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "matturo_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_delivery_events: {
        Row: {
          actor_id: string | null
          created_at: string
          delivery_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delivery_id: string
          id?: string
          status: string
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delivery_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_delivery_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "matturo_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_delivery_positions: {
        Row: {
          accuracy: number
          created_at: string
          delivery_id: string
          latitude: number
          longitude: number
          recorded_at: string
          updated_at: string
        }
        Insert: {
          accuracy: number
          created_at?: string
          delivery_id: string
          latitude: number
          longitude: number
          recorded_at?: string
          updated_at?: string
        }
        Update: {
          accuracy?: number
          created_at?: string
          delivery_id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_delivery_positions_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: true
            referencedRelation: "matturo_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_delivery_zones: {
        Row: {
          active: boolean
          created_at: string
          fee_cents: number
          id: string
          name: string
          postal_prefixes: string[]
          revision: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          fee_cents: number
          id?: string
          name: string
          postal_prefixes: string[]
          revision?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          fee_cents?: number
          id?: string
          name?: string
          postal_prefixes?: string[]
          revision?: number
          updated_at?: string
        }
        Relationships: []
      }
      matturo_loyalty_accounts: {
        Row: {
          created_at: string
          failed_attempts: number
          id: string
          locked_until: string | null
          password_hash: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          password_hash: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          password_hash?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_loyalty_accounts_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: true
            referencedRelation: "matturo_loyalty_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_loyalty_movements: {
        Row: {
          created_at: string
          id: string
          kind: string
          order_id: string
          points: number
          updated_at: string
          wallet_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          order_id: string
          points: number
          updated_at?: string
          wallet_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          order_id?: string
          points?: number
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_loyalty_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "matturo_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matturo_loyalty_movements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "matturo_loyalty_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_loyalty_redemptions: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          order_id: string
          points: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          points?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "matturo_loyalty_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "matturo_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matturo_loyalty_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "matturo_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_loyalty_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          revoked_at: string | null
          token_hash: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_loyalty_sessions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "matturo_loyalty_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_loyalty_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          phone: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      matturo_menu_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image: string | null
          name: string
          position: number
          revision: number
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image?: string | null
          name: string
          position?: number
          revision?: number
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image?: string | null
          name?: string
          position?: number
          revision?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      matturo_menu_items: {
        Row: {
          available: boolean
          category: string
          created_at: string
          description: string
          id: string
          image: string | null
          name: string
          position: number
          price_cents: number
          revision: number
          slug: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          available?: boolean
          category: string
          created_at?: string
          description?: string
          id: string
          image?: string | null
          name: string
          position?: number
          price_cents: number
          revision?: number
          slug: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          available?: boolean
          category?: string
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          name?: string
          position?: number
          price_cents?: number
          revision?: number
          slug?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      matturo_modifier_groups: {
        Row: {
          created_at: string
          id: string
          item_id: string
          max: number
          min: number
          name: string
          position: number
          required: boolean
          revision: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          item_id: string
          max?: number
          min?: number
          name: string
          position?: number
          required?: boolean
          revision?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          max?: number
          min?: number
          name?: string
          position?: number
          required?: boolean
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_modifier_groups_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "matturo_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_modifiers: {
        Row: {
          created_at: string
          group_id: string
          id: string
          item_id: string
          max: number
          name: string
          position: number
          price_cents: number
          revision: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id: string
          item_id: string
          max?: number
          name: string
          position?: number
          price_cents?: number
          revision?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          item_id?: string
          max?: number
          name?: string
          position?: number
          price_cents?: number
          revision?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_modifiers_item_id_group_id_fkey"
            columns: ["item_id", "group_id"]
            isOneToOne: false
            referencedRelation: "matturo_modifier_groups"
            referencedColumns: ["item_id", "id"]
          },
        ]
      }
      matturo_order_daily_counters: {
        Row: {
          created_at: string
          last_number: number
          order_day: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          last_number: number
          order_day: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          last_number?: number
          order_day?: string
          updated_at?: string
        }
        Relationships: []
      }
      matturo_order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          order_id: string
          status: string
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          status: string
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_order_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "matturo_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matturo_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "matturo_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_order_items: {
        Row: {
          created_at: string
          dish_id: string
          id: string
          line_total_cents: number
          name: string
          options: Json
          order_id: string
          qty: number
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dish_id: string
          id?: string
          line_total_cents: number
          name: string
          options?: Json
          order_id: string
          qty: number
          unit_price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dish_id?: string
          id?: string
          line_total_cents?: number
          name?: string
          options?: Json
          order_id?: string
          qty?: number
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "matturo_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_orders: {
        Row: {
          access_expires_at: string | null
          access_revoked_at: string | null
          access_token_hash: string
          address: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          daily_number: number
          delivery_fee_cents: number
          id: string
          idempotency_key: string | null
          notes: string | null
          order_day: string
          postal_code: string | null
          reference: string
          request_fingerprint: string | null
          service: string
          status: string
          subtotal_cents: number
          total_cents: number
          updated_at: string
          zone_name: string | null
        }
        Insert: {
          access_expires_at?: string | null
          access_revoked_at?: string | null
          access_token_hash: string
          address?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          daily_number: number
          delivery_fee_cents?: number
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_day: string
          postal_code?: string | null
          reference: string
          request_fingerprint?: string | null
          service: string
          status?: string
          subtotal_cents: number
          total_cents: number
          updated_at?: string
          zone_name?: string | null
        }
        Update: {
          access_expires_at?: string | null
          access_revoked_at?: string | null
          access_token_hash?: string
          address?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          daily_number?: number
          delivery_fee_cents?: number
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_day?: string
          postal_code?: string | null
          reference?: string
          request_fingerprint?: string | null
          service?: string
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          zone_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matturo_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "matturo_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          photo_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string
          photo_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          photo_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      matturo_push_tokens: {
        Row: {
          created_at: string
          id: string
          order_id: string
          path: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          path: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          path?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_push_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "matturo_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_restaurant_settings: {
        Row: {
          created_at: string
          id: boolean
          orders_paused: boolean
          revision: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          orders_paused?: boolean
          revision?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          orders_paused?: boolean
          revision?: number
          updated_at?: string
        }
        Relationships: []
      }
      matturo_tracking_links: {
        Row: {
          created_at: string
          delivery_id: string
          expires_at: string
          id: string
          revoked_at: string | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matturo_tracking_links_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "matturo_deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      matturo_user_roles: {
        Row: {
          created_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          attribute_name: string
          options: Json
          position: number | null
          product_id: string
          source_data: Json
        }
        Insert: {
          attribute_id: string
          attribute_name: string
          options?: Json
          position?: number | null
          product_id: string
          source_data?: Json
        }
        Update: {
          attribute_id?: string
          attribute_name?: string
          options?: Json
          position?: number | null
          product_id?: string
          source_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          code: string | null
          id: string
          legacy_base44_id: string | null
          name: string
          sort_order: number | null
          source_data: Json
        }
        Insert: {
          code?: string | null
          id?: string
          legacy_base44_id?: string | null
          name: string
          sort_order?: number | null
          source_data?: Json
        }
        Update: {
          code?: string | null
          id?: string
          legacy_base44_id?: string | null
          name?: string
          sort_order?: number | null
          source_data?: Json
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display: string | null
          id: string
          image: Json | null
          legacy_base44_id: string | null
          legacy_parent_id: string | null
          menu_order: number | null
          name: string
          parent_id: string | null
          slug: string
          source_count: number | null
          source_data: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display?: string | null
          id?: string
          image?: Json | null
          legacy_base44_id?: string | null
          legacy_parent_id?: string | null
          menu_order?: number | null
          name: string
          parent_id?: string | null
          slug: string
          source_count?: number | null
          source_data?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display?: string | null
          id?: string
          image?: Json | null
          legacy_base44_id?: string | null
          legacy_parent_id?: string | null
          menu_order?: number | null
          name?: string
          parent_id?: string | null
          slug?: string
          source_count?: number | null
          source_data?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_category_links: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_category_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_category_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_name: string | null
          is_primary: boolean
          position: number | null
          product_id: string
          source_url: string
          storage_path: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_name?: string | null
          is_primary?: boolean
          position?: number | null
          product_id: string
          source_url: string
          storage_path?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_name?: string | null
          is_primary?: boolean
          position?: number | null
          product_id?: string
          source_url?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ribbon_links: {
        Row: {
          product_id: string
          ribbon_id: string
        }
        Insert: {
          product_id: string
          ribbon_id: string
        }
        Update: {
          product_id?: string
          ribbon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ribbon_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ribbon_links_ribbon_id_fkey"
            columns: ["ribbon_id"]
            isOneToOne: false
            referencedRelation: "product_ribbons"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ribbons: {
        Row: {
          display_count: number | null
          id: string
          legacy_base44_id: string | null
          name: string
          source_data: Json
        }
        Insert: {
          display_count?: number | null
          id?: string
          legacy_base44_id?: string | null
          name: string
          source_data?: Json
        }
        Update: {
          display_count?: number | null
          id?: string
          legacy_base44_id?: string | null
          name?: string
          source_data?: Json
        }
        Relationships: []
      }
      product_variation_attribute_values: {
        Row: {
          attribute_id: string | null
          attribute_name: string
          legacy_attribute_id: string
          option: string | null
          variation_id: string
        }
        Insert: {
          attribute_id?: string | null
          attribute_name: string
          legacy_attribute_id: string
          option?: string | null
          variation_id: string
        }
        Update: {
          attribute_id?: string | null
          attribute_name?: string
          legacy_attribute_id?: string
          option?: string | null
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variation_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variation_attribute_values_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          attributes: Json
          backorders: string | null
          created_at: string | null
          description: string | null
          dimensions: Json | null
          id: string
          image: Json | null
          legacy_base44_id: string | null
          legacy_product_id: string | null
          low_stock_amount: number | null
          manage_stock: boolean | null
          menu_order: number | null
          meta_data: Json
          on_sale: boolean | null
          price: number | null
          product_id: string | null
          regular_price: number | null
          sale_price: number | null
          sku: string | null
          source_data: Json
          status: string | null
          stock_quantity: number | null
          stock_status: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          attributes?: Json
          backorders?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          image?: Json | null
          legacy_base44_id?: string | null
          legacy_product_id?: string | null
          low_stock_amount?: number | null
          manage_stock?: boolean | null
          menu_order?: number | null
          meta_data?: Json
          on_sale?: boolean | null
          price?: number | null
          product_id?: string | null
          regular_price?: number | null
          sale_price?: number | null
          sku?: string | null
          source_data?: Json
          status?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          attributes?: Json
          backorders?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          id?: string
          image?: Json | null
          legacy_base44_id?: string | null
          legacy_product_id?: string | null
          low_stock_amount?: number | null
          manage_stock?: boolean | null
          menu_order?: number | null
          meta_data?: Json
          on_sale?: boolean | null
          price?: number | null
          product_id?: string | null
          regular_price?: number | null
          sale_price?: number | null
          sku?: string | null
          source_data?: Json
          status?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json
          average_rating: number | null
          backorders: string | null
          created_at: string | null
          cross_sell_ids: Json
          default_attributes: Json
          description: string | null
          dimensions: Json | null
          download_expiry: number | null
          download_limit: number | null
          downloadable: boolean
          downloads: Json
          featured: boolean
          id: string
          legacy_base44_id: string | null
          low_stock_amount: number | null
          manage_stock: boolean
          meta_data: Json
          name: string
          on_sale: boolean
          price: number | null
          rating_count: number | null
          regular_price: number | null
          sale_price: number | null
          short_description: string | null
          sku: string | null
          slug: string
          sold_individually: boolean
          source_data: Json
          status: string
          stock_quantity: number | null
          stock_status: string | null
          tax_group: string | null
          tax_status: string | null
          total_sales: number | null
          updated_at: string | null
          upsell_ids: Json
          virtual: boolean
          weight: number | null
        }
        Insert: {
          attributes?: Json
          average_rating?: number | null
          backorders?: string | null
          created_at?: string | null
          cross_sell_ids?: Json
          default_attributes?: Json
          description?: string | null
          dimensions?: Json | null
          download_expiry?: number | null
          download_limit?: number | null
          downloadable?: boolean
          downloads?: Json
          featured?: boolean
          id?: string
          legacy_base44_id?: string | null
          low_stock_amount?: number | null
          manage_stock?: boolean
          meta_data?: Json
          name: string
          on_sale?: boolean
          price?: number | null
          rating_count?: number | null
          regular_price?: number | null
          sale_price?: number | null
          short_description?: string | null
          sku?: string | null
          slug: string
          sold_individually?: boolean
          source_data?: Json
          status?: string
          stock_quantity?: number | null
          stock_status?: string | null
          tax_group?: string | null
          tax_status?: string | null
          total_sales?: number | null
          updated_at?: string | null
          upsell_ids?: Json
          virtual?: boolean
          weight?: number | null
        }
        Update: {
          attributes?: Json
          average_rating?: number | null
          backorders?: string | null
          created_at?: string | null
          cross_sell_ids?: Json
          default_attributes?: Json
          description?: string | null
          dimensions?: Json | null
          download_expiry?: number | null
          download_limit?: number | null
          downloadable?: boolean
          downloads?: Json
          featured?: boolean
          id?: string
          legacy_base44_id?: string | null
          low_stock_amount?: number | null
          manage_stock?: boolean
          meta_data?: Json
          name?: string
          on_sale?: boolean
          price?: number | null
          rating_count?: number | null
          regular_price?: number | null
          sale_price?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          sold_individually?: boolean
          source_data?: Json
          status?: string
          stock_quantity?: number | null
          stock_status?: string | null
          tax_group?: string | null
          tax_status?: string | null
          total_sales?: number | null
          updated_at?: string | null
          upsell_ids?: Json
          virtual?: boolean
          weight?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      matturo_assign_order_courier: {
        Args: {
          p_admin_id: string
          p_courier_id: string
          p_destination: string
          p_lat: number
          p_lng: number
          p_order_id: string
        }
        Returns: string
      }
      matturo_has_role: { Args: { wanted: string }; Returns: boolean }
      matturo_loyalty_phone: { Args: { raw_phone: string }; Returns: string }
      matturo_next_daily_order_number: {
        Args: { p_day: string }
        Returns: number
      }
      matturo_place_loyalty_order: {
        Args: {
          p_items: Json
          p_order: Json
          p_reward?: boolean
          p_session_hash?: string
        }
        Returns: {
          id: string
          reference: string
        }[]
      }
      matturo_place_order: {
        Args: { p_items: Json; p_order: Json }
        Returns: {
          id: string
          reference: string
        }[]
      }
      matturo_record_position:
        | {
            Args: {
              actor: string
              delivery: string
              lat: number
              lng: number
              precision_m: number
            }
            Returns: undefined
          }
        | {
            Args: {
              delivery: string
              lat: number
              lng: number
              precision_m: number
            }
            Returns: undefined
          }
      matturo_set_courier_availability: {
        Args: { next_state: string; p_courier_id: string }
        Returns: string
      }
      matturo_set_delivery_state:
        | {
            Args: { actor: string; delivery: string; next_state: string }
            Returns: undefined
          }
        | { Args: { delivery: string; next_state: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
