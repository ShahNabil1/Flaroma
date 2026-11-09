import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HeroSettings {
  title: string;
  title_highlight: string;
  subtitle: string;
  description: string;
  cta_text: string;
  secondary_cta_text: string;
  image_url: string;
  image_urls: string[];
  video_url: string;
  video_active: boolean;
  badge_text: string;
  stat_1_value: string;
  stat_1_label: string;
  stat_2_value: string;
  stat_2_label: string;
  stat_3_value: string;
  stat_3_label: string;
  starting_price: string;
}

export interface ProductsSectionSettings {
  badge_text: string;
  title: string;
  subtitle: string;
}

export interface ProcessStep {
  num: string;
  icon: string;
  title: string;
  title_bn: string;
  desc: string;
  image_url?: string;
}

export interface ProcessSettings {
  badge_text: string;
  title: string;
  subtitle: string;
  steps: ProcessStep[];
}

export interface CommunitySettings {
  badge_text: string;
  title: string;
  subtitle: string;
  images: { url: string; alt: string }[];
}

export interface SiteSettings {
  hero?: HeroSettings;
  products_section?: ProductsSectionSettings;
  process?: ProcessSettings;
  community?: CommunitySettings;
}

export function useSiteSettings() {
  return useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");
      if (error) throw error;
      const settings: SiteSettings = {};
      for (const row of data || []) {
        (settings as any)[row.key] = row.value;
      }
      return settings;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}
