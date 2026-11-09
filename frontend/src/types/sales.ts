export interface Product {
  id: number;
  name: string;
  sku: string;
  selling_price: number;
  cost_price: number;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SaleItemResponse {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_selling_price: number;
  unit_cost_price: number;
  subtotal: number;
}

export interface SaleResponse {
  id: number;
  business_id: number;
  transaction_number: string;
  total_amount: number;
  total_cost: number;
  discount: number;
  payment_method: string;
  amount_received: number;
  change_amount: number;
  status: string;
  cashier_user_id: number;
  cashier_name: string | null;
  cancelled_at: string | null;
  cancelled_by_user_id: number | null;
  cancel_reason: string | null;
  created_at: string;
  items: SaleItemResponse[];
}