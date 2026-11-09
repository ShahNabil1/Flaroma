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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_pin: {
        Row: {
          id: string
          pin_hash: string
          updated_at: string
        }
        Insert: {
          id?: string
          pin_hash: string
          updated_at?: string
        }
        Update: {
          id?: string
          pin_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_settings: {
        Row: {
          fb_capi_token: string | null
          fb_pixel_id: string | null
          ga4_id: string | null
          gtm_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          fb_capi_token?: string | null
          fb_pixel_id?: string | null
          ga4_id?: string | null
          gtm_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          fb_capi_token?: string | null
          fb_pixel_id?: string | null
          ga4_id?: string | null
          gtm_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      build_flow_options: {
        Row: {
          created_at: string
          emoji: string | null
          enable_color_selection: boolean
          id: string
          image_url: string | null
          is_premium: boolean
          name: string
          name_bn: string | null
          price: number
          sort_order: number
          step_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          enable_color_selection?: boolean
          id?: string
          image_url?: string | null
          is_premium?: boolean
          name: string
          name_bn?: string | null
          price?: number
          sort_order?: number
          step_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          enable_color_selection?: boolean
          id?: string
          image_url?: string | null
          is_premium?: boolean
          name?: string
          name_bn?: string | null
          price?: number
          sort_order?: number
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_flow_options_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "build_flow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      build_flow_steps: {
        Row: {
          created_at: string
          id: string
          max_selections: number
          sort_order: number
          title: string
          title_bn: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          max_selections?: number
          sort_order?: number
          title: string
          title_bn?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          max_selections?: number
          sort_order?: number
          title?: string
          title_bn?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          min_order_amount: number
          product_id: string | null
          updated_at: string
          usage_limit: number
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          min_order_amount?: number
          product_id?: string | null
          updated_at?: string
          usage_limit?: number
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          min_order_amount?: number
          product_id?: string | null
          updated_at?: string
          usage_limit?: number
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          last_validation_data: Json | null
          phone_validity_status: string
          risk_level: string | null
          status: string
          success_rate: number | null
          total_cancel: number
          total_orders: number
          total_success: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          last_validation_data?: Json | null
          phone_validity_status?: string
          risk_level?: string | null
          status?: string
          success_rate?: number | null
          total_cancel?: number
          total_orders?: number
          total_success?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          last_validation_data?: Json | null
          phone_validity_status?: string
          risk_level?: string | null
          status?: string
          success_rate?: number | null
          total_cancel?: number
          total_orders?: number
          total_success?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_settings: {
        Row: {
          area_key: string
          area_name: string
          charge: number
          created_at: string
          display_text: string
          id: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          area_key: string
          area_name: string
          charge?: number
          created_at?: string
          display_text?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          area_key?: string
          area_name?: string
          charge?: number
          created_at?: string
          display_text?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_body: string
          id: string
          subject: string
          template_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_body?: string
          id?: string
          subject?: string
          template_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          html_body?: string
          id?: string
          subject?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          advance_amount: number
          coupon_code: string | null
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          customization_note: string | null
          delivery_area: string
          delivery_charge: number
          discount: number
          discount_from_coupon: number
          id: string
          image_url: string | null
          invoice_url: string | null
          payment_status: string
          product_id: string | null
          product_title: string
          quantity: number
          source: string
          status: string
          steadfast_consignment_id: string | null
          steadfast_status: string | null
          steadfast_tracking_code: string | null
          total_amount: number
          unit_price: number
          updated_at: string
          variant: string | null
        }
        Insert: {
          advance_amount?: number
          coupon_code?: string | null
          created_at?: string
          customer_address: string
          customer_name: string
          customer_phone: string
          customization_note?: string | null
          delivery_area?: string
          delivery_charge?: number
          discount?: number
          discount_from_coupon?: number
          id?: string
          image_url?: string | null
          invoice_url?: string | null
          payment_status?: string
          product_id?: string | null
          product_title: string
          quantity?: number
          source?: string
          status?: string
          steadfast_consignment_id?: string | null
          steadfast_status?: string | null
          steadfast_tracking_code?: string | null
          total_amount?: number
          unit_price?: number
          updated_at?: string
          variant?: string | null
        }
        Update: {
          advance_amount?: number
          coupon_code?: string | null
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          customization_note?: string | null
          delivery_area?: string
          delivery_charge?: number
          discount?: number
          discount_from_coupon?: number
          id?: string
          image_url?: string | null
          invoice_url?: string | null
          payment_status?: string
          product_id?: string | null
          product_title?: string
          quantity?: number
          source?: string
          status?: string
          steadfast_consignment_id?: string | null
          steadfast_status?: string | null
          steadfast_tracking_code?: string | null
          total_amount?: number
          unit_price?: number
          updated_at?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          price_modifier: number
          product_id: string
          variant_type: string
          variant_value: string
        }
        Insert: {
          created_at?: string
          id?: string
          price_modifier?: number
          product_id: string
          variant_type: string
          variant_value: string
        }
        Update: {
          created_at?: string
          id?: string
          price_modifier?: number
          product_id?: string
          variant_type?: string
          variant_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          created_at: string
          delivery_policy: string | null
          description: string | null
          id: string
          image_url: string | null
          show_trust_badges: boolean
          slug: string
          sort_order: number
          status: string
          storage_instructions: string | null
          tag: string | null
          title: string
          title_bn: string | null
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          delivery_policy?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          show_trust_badges?: boolean
          slug: string
          sort_order?: number
          status?: string
          storage_instructions?: string | null
          tag?: string | null
          title: string
          title_bn?: string | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          delivery_policy?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          show_trust_badges?: boolean
          slug?: string
          sort_order?: number
          status?: string
          storage_instructions?: string | null
          tag?: string | null
          title?: string
          title_bn?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string
          id: string
          image_url: string | null
          product_id: string
          rating: number
          status: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name: string
          id?: string
          image_url?: string | null
          product_id: string
          rating: number
          status?: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          image_url?: string | null
          product_id?: string
          rating?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          allowed: boolean
          id: string
          page_key: string
          user_id: string
        }
        Insert: {
          allowed?: boolean
          id?: string
          page_key: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          id?: string
          page_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_requests: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_draft_orders: { Args: never; Returns: undefined }
      get_order_by_short_id: {
        Args: { short_id: string }
        Returns: {
          advance_amount: number
          coupon_code: string | null
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          customization_note: string | null
          delivery_area: string
          delivery_charge: number
          discount: number
          discount_from_coupon: number
          id: string
          image_url: string | null
          invoice_url: string | null
          payment_status: string
          product_id: string | null
          product_title: string
          quantity: number
          source: string
          status: string
          steadfast_consignment_id: string | null
          steadfast_status: string | null
          steadfast_tracking_code: string | null
          total_amount: number
          unit_price: number
          updated_at: string
          variant: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          allowed: boolean
          page_key: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_admin_pin: { Args: { new_pin: string }; Returns: undefined }
      verify_admin_pin: { Args: { input_pin: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "admin" | "developer"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "developer"],
    },
  },
} as const
