/**
 * BrewSync — Fallback data used when Supabase is not yet configured.
 * This mirrors the seed data from supabase-schema.sql so the app works offline.
 */

export const fallbackBanners = [
  {
    id: 'b1',
    image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80',
    tag: 'NEW ARRIVAL',
    title: 'Cold Brew & Beyond',
    subtitle: 'Slow-steeped, bold, refreshing',
    sort_order: 1
  },
  {
    id: 'b2',
    image_url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80',
    tag: "TODAY'S PICK",
    title: 'Pastry & Desserts',
    subtitle: 'Freshly baked every morning',
    sort_order: 2
  },
  {
    id: 'b3',
    image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80',
    tag: 'COMBO DEAL',
    title: 'Sandwich + Coffee',
    subtitle: 'Save ₹50 on any combo',
    sort_order: 3
  }
];

export const fallbackCategories = [
  { id: 'c1', name: 'Hot Coffee', slug: 'hot-coffee', image_url: null, banner_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=70', sort_order: 1 },
  { id: 'c2', name: 'Cold Coffee', slug: 'cold-coffee', image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&q=70', banner_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=70', sort_order: 2 },
  { id: 'c3', name: 'Teas & Infusions', slug: 'teas', image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=200&q=70', banner_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=70', sort_order: 3 },
  { id: 'c4', name: 'Sandwiches', slug: 'sandwiches', image_url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=200&q=70', banner_url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600&q=70', sort_order: 4 },
  { id: 'c5', name: 'Pastries', slug: 'pastries', image_url: 'https://images.unsplash.com/photo-1612203985729-70726954388c?w=200&q=70', banner_url: 'https://images.unsplash.com/photo-1612203985729-70726954388c?w=600&q=70', sort_order: 5 },
  { id: 'c6', name: 'Meals', slug: 'meals', image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=70', banner_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=70', sort_order: 6 },
  { id: 'c7', name: 'Coolers & Juices', slug: 'beverages', image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&q=70', banner_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=70', sort_order: 7 },
  { id: 'c8', name: 'Snacks', slug: 'snacks', image_url: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200&q=70', banner_url: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600&q=70', sort_order: 8 }
];

export const fallbackMenuItems = [
  // Hot Coffee
  { id: 'm1', category_id: 'c1', name: 'Signature Flat White', price: 199, description: "Double ristretto shots with velvety steamed milk. Our barista's pride.", image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=200&q=70', emoji: '☕', is_veg: true, is_featured: true, is_customizable: true, sort_order: 1 },
  { id: 'm2', category_id: 'c1', name: 'Cappuccino', price: 169, description: 'Equal parts espresso, steamed milk & silky foam.', image_url: null, emoji: '☕', is_veg: true, is_featured: false, is_customizable: false, sort_order: 2 },
  { id: 'm3', category_id: 'c1', name: 'Café Americano', price: 149, description: 'Bold espresso diluted with hot water. Clean and strong.', image_url: null, emoji: '🖤', is_veg: true, is_featured: false, is_customizable: false, sort_order: 3 },
  { id: 'm4', category_id: 'c1', name: 'Café Latte', price: 179, description: 'Smooth espresso with generous steamed milk and a light foam top.', image_url: null, emoji: '☕', is_veg: true, is_featured: false, is_customizable: true, sort_order: 4 },
  { id: 'm5', category_id: 'c1', name: 'Espresso Shot', price: 99, description: 'Intense, concentrated shot of pure coffee. For the purist.', image_url: null, emoji: '⚡', is_veg: true, is_featured: false, is_customizable: false, sort_order: 5 },

  // Cold Coffee
  { id: 'm6', category_id: 'c2', name: 'Cold Brew', price: 229, description: 'Steeped 18 hours. Smooth, low-acid, naturally sweet.', image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=70', emoji: '🧊', is_veg: true, is_featured: false, is_customizable: false, sort_order: 1 },
  { id: 'm7', category_id: 'c2', name: 'Iced Caramel Latte', price: 259, description: 'Espresso, cold milk, caramel drizzle over ice.', image_url: null, emoji: '🧋', is_veg: true, is_featured: false, is_customizable: true, sort_order: 2 },
  { id: 'm8', category_id: 'c2', name: 'Mocha Frappuccino', price: 279, description: 'Blended iced coffee with chocolate, milk and whipped cream.', image_url: null, emoji: '🍫', is_veg: true, is_featured: false, is_customizable: true, sort_order: 3 },
  { id: 'm9', category_id: 'c2', name: 'Vietnamese Iced Coffee', price: 249, description: 'Strong dark roast with sweetened condensed milk over ice.', image_url: null, emoji: '🇻🇳', is_veg: true, is_featured: false, is_customizable: false, sort_order: 4 },

  // Teas
  { id: 'm10', category_id: 'c3', name: 'Masala Chai', price: 99, description: 'Traditional Indian spiced tea with ginger, cardamom & cinnamon.', image_url: null, emoji: '🍵', is_veg: true, is_featured: false, is_customizable: false, sort_order: 1 },
  { id: 'm11', category_id: 'c3', name: 'Matcha Latte', price: 219, description: 'Ceremonial grade matcha whisked with steamed oat milk.', image_url: null, emoji: '🍃', is_veg: true, is_featured: false, is_customizable: true, sort_order: 2 },
  { id: 'm12', category_id: 'c3', name: 'Chamomile Infusion', price: 149, description: 'Soothing chamomile flowers steeped with honey.', image_url: null, emoji: '🌼', is_veg: true, is_featured: false, is_customizable: false, sort_order: 3 },

  // Sandwiches
  { id: 'm13', category_id: 'c4', name: 'Grilled Pesto Panini', price: 279, description: 'Sun-dried tomato, mozzarella & basil pesto on sourdough.', image_url: 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=200&q=70', emoji: '🥪', is_veg: true, is_featured: true, is_customizable: true, sort_order: 1 },
  { id: 'm14', category_id: 'c4', name: 'Chicken Club Sandwich', price: 329, description: 'Grilled chicken, bacon, lettuce, tomato, mayo on toasted bread.', image_url: null, emoji: '🥪', is_veg: false, is_featured: false, is_customizable: false, sort_order: 2 },
  { id: 'm15', category_id: 'c4', name: 'Veggie Wrap', price: 219, description: 'Fresh vegetables, hummus, feta cheese in a whole wheat tortilla.', image_url: null, emoji: '🌯', is_veg: true, is_featured: false, is_customizable: true, sort_order: 3 },

  // Pastries
  { id: 'm16', category_id: 'c5', name: 'Butter Croissant', price: 129, description: 'Flaky, golden, freshly baked every morning.', image_url: null, emoji: '🥐', is_veg: true, is_featured: false, is_customizable: false, sort_order: 1 },
  { id: 'm17', category_id: 'c5', name: 'Chocolate Lava Cake', price: 189, description: 'Warm chocolate cake with molten centre. Served with vanilla cream.', image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=200&q=70', emoji: '🍫', is_veg: true, is_featured: false, is_customizable: false, sort_order: 2 },
  { id: 'm18', category_id: 'c5', name: 'Blueberry Muffin', price: 139, description: 'Soft, moist muffin loaded with fresh blueberries.', image_url: null, emoji: '🫐', is_veg: true, is_featured: false, is_customizable: false, sort_order: 3 },

  // Meals
  { id: 'm19', category_id: 'c6', name: 'Margherita Pizza', price: 349, description: 'Classic thin crust with fresh mozzarella, tomato & basil.', image_url: null, emoji: '🍕', is_veg: true, is_featured: false, is_customizable: true, sort_order: 1 },
  { id: 'm20', category_id: 'c6', name: 'Chicken Alfredo Pasta', price: 389, description: 'Penne in creamy parmesan sauce with grilled chicken.', image_url: null, emoji: '🍝', is_veg: false, is_featured: false, is_customizable: false, sort_order: 2 },
  { id: 'm21', category_id: 'c6', name: 'Garden Bowl', price: 299, description: 'Quinoa, roasted veggies, avocado, tahini dressing.', image_url: null, emoji: '🥗', is_veg: true, is_featured: true, is_customizable: false, sort_order: 3 },

  // Coolers
  { id: 'm22', category_id: 'c7', name: 'Fresh Orange Juice', price: 179, description: 'Freshly squeezed Nagpur oranges. No added sugar.', image_url: null, emoji: '🍊', is_veg: true, is_featured: false, is_customizable: false, sort_order: 1 },
  { id: 'm23', category_id: 'c7', name: 'Mango Smoothie', price: 199, description: 'Alphonso mango blended with yogurt and honey.', image_url: null, emoji: '🥭', is_veg: true, is_featured: false, is_customizable: false, sort_order: 2 },
  { id: 'm24', category_id: 'c7', name: 'Mint Lemonade', price: 129, description: 'Chilled lemonade with fresh mint and a hint of ginger.', image_url: null, emoji: '🍋', is_veg: true, is_featured: false, is_customizable: false, sort_order: 3 },

  // Snacks
  { id: 'm25', category_id: 'c8', name: 'Cheese Garlic Toast', price: 149, description: 'Thick-cut bread, garlic butter, melted cheese. Perfect with coffee.', image_url: null, emoji: '🧀', is_veg: true, is_featured: false, is_customizable: false, sort_order: 1 },
  { id: 'm26', category_id: 'c8', name: 'French Fries', price: 129, description: 'Crispy golden fries with peri-peri seasoning.', image_url: null, emoji: '🍟', is_veg: true, is_featured: false, is_customizable: false, sort_order: 2 },
  { id: 'm27', category_id: 'c8', name: 'Chicken Wings', price: 249, description: 'Spicy buffalo wings with ranch dipping sauce. 6 pcs.', image_url: null, emoji: '🍗', is_veg: false, is_featured: false, is_customizable: false, sort_order: 3 }
];

export const fallbackCoupons = [
  { id: 'cp1', code: 'BREW10', type: 'percent', value: 10, min_order: 300, description: 'Get 10% off on orders above ₹300', is_active: true },
  { id: 'cp2', code: 'FIRST50', type: 'flat', value: 50, min_order: 0, description: 'Flat ₹50 off on your first order', is_active: true },
  { id: 'cp3', code: 'COMBO100', type: 'flat', value: 100, min_order: 500, description: 'Flat ₹100 off on orders above ₹500', is_active: true }
];
