
import { AllocationPercentages, UserType, ExpenseCategory, IncomeSourceType } from './types';

export const DEFAULT_ALLOCATION: AllocationPercentages = {
  essentials: 40,
  savings: 20,
  investments: 20,
  emergency: 10,
  goals: 10,
};

export const CURRENCIES = [
  { label: 'Rupee (₹)', symbol: '₹' },
  { label: 'Dollar ($)', symbol: '$' },
  { label: 'Euro (€)', symbol: '€' },
  { label: 'Pound (£)', symbol: '£' },
  { label: 'Yen (¥)', symbol: '¥' },
];

// Mapping UserType to their primary IncomeSourceType
export const USER_TYPE_INCOME_MAPPING: Record<UserType, IncomeSourceType> = {
  [UserType.EMPLOYEE]: IncomeSourceType.SALARY,
  [UserType.BUSINESS]: IncomeSourceType.BUSINESS_PROFIT,
  [UserType.STUDENT]: IncomeSourceType.PART_TIME,
};

// Sub-division of the "Essentials" portion based on UserType
export const TYPE_SPECIFIC_SUB_ALLOCATIONS: Record<UserType, Partial<Record<ExpenseCategory, number>>> = {
  [UserType.EMPLOYEE]: {
    [ExpenseCategory.RENT]: 35,
    [ExpenseCategory.FOOD]: 25,
    [ExpenseCategory.ENTERTAINMENT]: 15,
    [ExpenseCategory.MEDICAL]: 15,
    [ExpenseCategory.UTILITIES]: 10,
  },
  [UserType.BUSINESS]: {
    [ExpenseCategory.BUSINESS_RESERVATION]: 35,
    [ExpenseCategory.TAX_RESERVE]: 25,
    [ExpenseCategory.PROVISIONS]: 20,
    [ExpenseCategory.BUSINESS_COSTS]: 15,
    [ExpenseCategory.UTILITIES]: 5,
  },
  [UserType.STUDENT]: {
    [ExpenseCategory.RENT]: 30,
    [ExpenseCategory.EDUCATION]: 30,
    [ExpenseCategory.FOOD]: 15,
    [ExpenseCategory.TRAVEL]: 10,
    [ExpenseCategory.ENTERTAINMENT]: 15,
  },
};

export const SUB_CATEGORIES: Record<string, string[]> = {
  [ExpenseCategory.FOOD]: ['Groceries', 'Restaurants', 'Dining Out', 'Snacks', 'Drinks'],
  [ExpenseCategory.TRAVEL]: ['Public Transport', 'Flights', 'Taxi/Ride-share', 'Fuel', 'Parking'],
  [ExpenseCategory.UTILITIES]: ['Electricity', 'Water', 'Internet', 'Mobile', 'Gas', 'Subscription'],
  [ExpenseCategory.MEDICAL]: ['Consultation', 'Pharmacy', 'Lab Tests', 'Health Insurance', 'Hospital'],
  [ExpenseCategory.EDUCATION]: ['Tuition', 'Books', 'Online Course', 'Certification', 'Exam Fees'],
  [ExpenseCategory.BUSINESS_COSTS]: ['Marketing', 'Software', 'Supplies', 'Legal', 'Freelancers'],
  [ExpenseCategory.BUSINESS_RESERVATION]: ['Emergency Fund', 'Expansion', 'Technology Buffer'],
  [ExpenseCategory.PROVISIONS]: ['Equipment', 'Maintenance', 'Repairs', 'Office Upkeep'],
  [ExpenseCategory.TAX_RESERVE]: ['Income Tax', 'GST/VAT', 'Property Tax', 'Professional Tax'],
  [ExpenseCategory.ENTERTAINMENT]: ['Movies', 'Streaming', 'Gaming', 'Outings', 'Concerts', 'Hobbies'],
  [ExpenseCategory.OTHER]: ['Gifts', 'Donations', 'Maintenance', 'Miscellaneous'],
};

export const CATEGORY_COLORS: Record<string, string> = {
  Rent: '#3b82f6',
  Food: '#10b981',
  Travel: '#f59e0b',
  Utilities: '#6366f1',
  Education: '#ec4899',
  Medical: '#f43f5e',
  'Business Costs': '#8b5cf6',
  'Business Reservation': '#0ea5e9',
  Provisions: '#84cc16',
  'Tax Reserve': '#ef4444',
  Entertainment: '#f97316',
  Other: '#64748b',
};

export const USER_TYPE_SUGGESTIONS: Record<UserType, string[]> = {
  [UserType.EMPLOYEE]: ['SIP', 'PPF', 'Mutual Funds', 'Corporate Bonds'],
  [UserType.BUSINESS]: ['Business Reinvestment', 'Fixed Deposits', 'Government Bonds', 'Commercial Real Estate'],
  [UserType.STUDENT]: ['Recurring Deposits', 'Index Funds', 'Skill Certifications', 'High-Yield Savings'],
};
