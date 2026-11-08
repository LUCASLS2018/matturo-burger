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
      [_ in never]: never
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
