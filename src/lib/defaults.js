// Default categories seeded into every new budget/profile.
// Colors are chosen to read well against the cute pink theme and in charts.

export const DEFAULT_CATEGORIES = [
  { name: 'Groceries', emoji: '🛒', color: '#ff8fb1', monthlyBudget: null },
  { name: 'Restaurant', emoji: '🍜', color: '#ffa552', monthlyBudget: null },
  { name: 'Outing', emoji: '🎡', color: '#c08cf0', monthlyBudget: null },
  { name: 'Transport', emoji: '🚌', color: '#5fc9d6', monthlyBudget: null },
  { name: 'Bills', emoji: '🧾', color: '#7a86e0', monthlyBudget: null },
  { name: 'Shopping', emoji: '🛍️', color: '#ff6f9c', monthlyBudget: null },
  { name: 'Health', emoji: '💊', color: '#66c3bb', monthlyBudget: null },
  { name: 'Fun', emoji: '🎮', color: '#ffcf5c', monthlyBudget: null },
];

// A palette used when the user adds a new category (cycled through).
export const CATEGORY_COLORS = [
  '#ff8fb1', '#ffa552', '#c08cf0', '#5fc9d6', '#7a86e0',
  '#ff6f9c', '#66c3bb', '#ffcf5c', '#8fd694', '#f48fb1',
  '#b39ddb', '#4dd0e1', '#ffab91', '#ce93d8', '#80cbc4',
];

// Emoji choices offered in the category emoji picker.
export const EMOJI_CHOICES = [
  '🛒', '🍜', '🍔', '☕', '🎡', '🚌', '🚗', '✈️', '🧾', '🏠',
  '🛍️', '👗', '💊', '🏥', '🎮', '🎬', '🎁', '💅', '📚', '🐾',
  '💻', '📱', '⚽', '🎨', '🌸', '💰', '💖', '🍰', '🍩', '🎀',
];

export const GOAL_EMOJI_CHOICES = [
  '🎯', '👕', '👟', '🎧', '💻', '📱', '🚲', '✈️', '🏖️', '🎸',
  '💍', '🏠', '🚗', '📷', '⌚', '🎮', '🧸', '💄', '🌟', '💖',
];
