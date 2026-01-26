const categoryColorMap: Record<string, { bg: string; text: string; badge: string; gradient: string }> = {
  'Engine': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    badge: 'bg-blue-600',
    gradient: 'from-blue-400 to-blue-600'
  },
  'Transmission': {
    bg: 'bg-green-50',
    text: 'text-green-700',
    badge: 'bg-green-600',
    gradient: 'from-green-400 to-green-600'
  },
  'Electronics': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    badge: 'bg-amber-600',
    gradient: 'from-amber-400 to-amber-600'
  },
  'Suspension': {
    bg: 'bg-red-50',
    text: 'text-red-700',
    badge: 'bg-red-600',
    gradient: 'from-red-400 to-red-600'
  },
  'Brakes': {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    badge: 'bg-teal-600',
    gradient: 'from-teal-400 to-teal-600'
  },
  'Exhaust': {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    badge: 'bg-cyan-600',
    gradient: 'from-cyan-400 to-cyan-600'
  },
  'Interior': {
    bg: 'bg-lime-50',
    text: 'text-lime-700',
    badge: 'bg-lime-600',
    gradient: 'from-lime-400 to-lime-600'
  },
  'Exterior': {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    badge: 'bg-orange-600',
    gradient: 'from-orange-400 to-orange-600'
  },
  'Lighting': {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    badge: 'bg-pink-600',
    gradient: 'from-pink-400 to-pink-600'
  },
  'Cooling': {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    badge: 'bg-sky-600',
    gradient: 'from-sky-400 to-sky-600'
  },
  'Fuel System': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    badge: 'bg-emerald-600',
    gradient: 'from-emerald-400 to-emerald-600'
  },
  'Turbo': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    badge: 'bg-rose-600',
    gradient: 'from-rose-400 to-rose-600'
  },
  'Wheels': {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    badge: 'bg-violet-600',
    gradient: 'from-violet-400 to-violet-600'
  },
  'Body': {
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-700',
    badge: 'bg-fuchsia-600',
    gradient: 'from-fuchsia-400 to-fuchsia-600'
  },
  'Electrical': {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    badge: 'bg-yellow-600',
    gradient: 'from-yellow-400 to-yellow-600'
  },
};

const defaultCategory = {
  bg: 'bg-gray-50',
  text: 'text-gray-700',
  badge: 'bg-gray-600',
  gradient: 'from-gray-400 to-gray-600'
};

export const getCategoryColor = (category: string) => {
  return categoryColorMap[category] || defaultCategory;
};

export const getAllCategoryColors = () => {
  return categoryColorMap;
};
