import {
  Sparkles, Wrench, Zap, Hammer, PaintRoller, Sprout, ChefHat, Shirt, Baby, Truck,
  Package, ShoppingBag, Car, Scissors, Stethoscope, GraduationCap, Banknote, Monitor,
  Palette, Music, Shield, Scale, Briefcase, LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles, wrench: Wrench, zap: Zap, hammer: Hammer, 'paint-roller': PaintRoller,
  sprout: Sprout, 'chef-hat': ChefHat, shirt: Shirt, baby: Baby, truck: Truck, package: Package,
  'shopping-bag': ShoppingBag, car: Car, scissors: Scissors, stethoscope: Stethoscope,
  'graduation-cap': GraduationCap, banknote: Banknote, monitor: Monitor, palette: Palette,
  music: Music, shield: Shield, scale: Scale, briefcase: Briefcase,
};

export function CategoryIcon({ icon, className = 'h-5 w-5' }: { icon?: string; className?: string }) {
  const Icon = (icon && MAP[icon]) || Briefcase;
  return <Icon className={className} />;
}

// taxonomy group key → icon (for sync rendering where only the key is known)
export const GROUP_ICON: Record<string, string> = {
  delivery_logistics: 'package', driving_transport: 'car', home_cleaning: 'sparkles',
  skilled_construction: 'hammer', repairs_technical: 'wrench', food_hospitality: 'chef-hat',
  retail_sales: 'shopping-bag', care_domestic: 'baby', beauty_wellness: 'scissors',
  health_medical: 'stethoscope', education_training: 'graduation-cap', office_admin: 'briefcase',
  finance_banking: 'banknote', technology_digital: 'monitor', creative_media: 'palette',
  events_arts: 'music', agriculture_rural: 'sprout', security_facilities: 'shield',
  professional_consulting: 'scale', micro_gigs: 'shopping-bag',
};
