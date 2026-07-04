import type { Product, Cost, Order } from '@/types';
import { supabase } from './supabase';

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatKM = (value: number) => `${value.toFixed(2).replace('.', ',')} KM`;

const statusLabel = (status: Product['status']) => {
  switch (status) {
    case 'in_stock':
      return 'In Stock';
    case 'listed':
      return 'Listed';
    case 'sold_out':
      return 'Sold Out';
  }
};

const costCategoryLabel = (category: Cost['category']) => {
  const map: Record<Cost['category'], string> = {
    ai_tools: 'AI Tools',
    shipping: 'Shipping',
    packaging: 'Packaging',
    ads: 'Ads',
    other: 'Other',
  };
  return map[category] || category;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB');
};

function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const escaped = String(cell).replace(/"/g, '""');
          return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8;',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/* ------------------------------------------------------------------ */
/*  CSV Export                                                         */
/* ------------------------------------------------------------------ */

export function exportToCSV(products: Product[], costs: Cost[], orders: Order[]): void {
  const dateStr = new Date().toISOString().split('T')[0];

  /* ---- Inventory CSV ---- */
  const inventoryHeader = [
    'Item Name',
    'Category',
    'Source',
    'Total Quantity',
    'Total Sold',
    'Remaining',
    'Buy Price (KM)',
    'Original Price (KM)',
    'Target Price (KM)',
    'Sold Price (KM)',
    'Status',
    'Profit per Unit (KM)',
    'Total Profit (KM)',
    'Created Date',
    'Notes',
  ];

  const inventoryRows: string[][] = [inventoryHeader];

  for (const p of products) {
    const remaining = p.totalQuantity - p.totalSold;
    const profitPerUnit = p.soldPrice !== undefined ? p.soldPrice - p.buyPrice : 0;
    const totalProfit = profitPerUnit * p.totalSold;

    inventoryRows.push([
      p.name,
      p.category,
      p.source,
      String(p.totalQuantity),
      String(p.totalSold),
      String(remaining),
      formatKM(p.buyPrice),
      p.originalPrice !== undefined ? formatKM(p.originalPrice) : '',
      formatKM(p.targetPrice),
      p.soldPrice !== undefined ? formatKM(p.soldPrice) : '',
      statusLabel(p.status),
      p.soldPrice !== undefined ? formatKM(profitPerUnit) : '',
      p.soldPrice !== undefined ? formatKM(totalProfit) : '',
      formatDate(p.createdAt),
      p.notes || '',
    ]);

    /* Option detail rows */
    if (p.options && p.options.length > 0) {
      for (const opt of p.options) {
        const optRemaining = opt.quantity - opt.soldQuantity;
        const variantLabel = [opt.color, opt.size].filter(Boolean).join(' / ') || opt.name;
        const batchSummary = opt.batches
          .map((b) => `${b.quantity} @ ${formatKM(b.buyPrice)}`)
          .join(', ');
        inventoryRows.push([
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          `Option: ${variantLabel} — Batches: ${batchSummary}`,
          String(opt.quantity),
          String(opt.soldQuantity),
          String(optRemaining),
        ]);
      }
    }
  }

  /* ---- Costs CSV ---- */
  const costsHeader = ['Date', 'Name', 'Category', 'Amount (KM)', 'Description', 'Recurring'];

  const costsRows: string[][] = [
    costsHeader,
    ...costs.map((c) => [
      formatDate(c.date),
      c.name,
      costCategoryLabel(c.category),
      formatKM(c.amount),
      c.description || '',
      c.isRecurring ? 'Yes' : 'No',
    ]),
  ];

  /* ---- Orders CSV ---- */
  const ordersHeader = [
    'Date',
    'Product',
    'Option',
    'Quantity',
    'Sell Price (KM)',
    'Buy Cost (KM)',
    'Total (KM)',
    'Platform',
    'Customer',
    'Notes',
  ];

  const ordersRows: string[][] = [
    ordersHeader,
    ...orders.map((o) => [
      formatDate(o.date),
      o.productName,
      o.optionName || '',
      String(o.quantity),
      formatKM(o.sellPrice),
      o.buyCost !== undefined ? formatKM(o.buyCost) : '',
      formatKM(o.totalAmount),
      o.platform,
      o.customerName || '',
      o.notes || '',
    ]),
  ];

  /* Trigger sequential downloads */
  downloadCSV(`reselltrack-inventory-${dateStr}.csv`, inventoryRows);
  setTimeout(() => {
    downloadCSV(`reselltrack-costs-${dateStr}.csv`, costsRows);
  }, 300);
  setTimeout(() => {
    downloadCSV(`reselltrack-orders-${dateStr}.csv`, ordersRows);
  }, 600);
}

/* ------------------------------------------------------------------ */
/*  JSON Export                                                        */
/* ------------------------------------------------------------------ */

export function exportToJSON(products: Product[], costs: Cost[], orders: Order[]): void {
  const data = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    products,
    costs,
    orders,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `reselltrack-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/* ------------------------------------------------------------------ */
/*  JSON Import                                                        */
/* ------------------------------------------------------------------ */

interface BackupData {
  version?: string;
  products?: Product[];
  costs?: Cost[];
  orders?: Order[];
}

export async function importFromJSON(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data: BackupData = JSON.parse(e.target?.result as string);
        const userId = await getCurrentUserId();

        // Map old IDs to new Supabase UUIDs
        const productIdMap = new Map<string, string>();
        const optionIdMap = new Map<string, string>();

        // ── Import products ─────────────────────────────────────────
        if (data.products && data.products.length > 0) {
          for (const p of data.products) {
            const { data: inserted, error } = await supabase
              .from('products')
              .insert({
                name: p.name,
                category: p.category,
                image_url: p.imageUrl ?? null,
                buy_price: p.buyPrice,
                original_price: p.originalPrice ?? null,
                target_price: p.targetPrice,
                sold_price: p.soldPrice ?? null,
                status: p.status,
                total_quantity: p.totalQuantity,
                total_sold: p.totalSold,
                source: p.source,
                notes: p.notes ?? null,
                created_at: p.createdAt,
                updated_at: p.updatedAt,
                user_id: userId,
              })
              .select('id')
              .single();

            if (error || !inserted) {
              console.error('Failed to import product:', error);
              continue;
            }

            productIdMap.set(p.id, inserted.id);

            // Insert options for this product
            if (p.options && p.options.length > 0) {
              for (const opt of p.options) {
                const { data: optInserted, error: optError } = await supabase
                  .from('product_options')
                  .insert({
                    product_id: inserted.id,
                    name: opt.name,
                    color: opt.color ?? null,
                    size: opt.size ?? null,
                    quantity: opt.quantity,
                    sold_quantity: opt.soldQuantity,
                    batches: opt.batches,
                  })
                  .select('id')
                  .single();

                if (optError || !optInserted) {
                  console.error('Failed to import option:', optError);
                  continue;
                }

                optionIdMap.set(opt.id, optInserted.id);
              }
            }
          }
        }

        // ── Import costs ────────────────────────────────────────────
        if (data.costs && data.costs.length > 0) {
          const costRows = data.costs.map((c) => ({
            name: c.name,
            category: c.category,
            amount: c.amount,
            date: c.date.split('T')[0],
            description: c.description ?? null,
            is_recurring: c.isRecurring,
            created_at: c.createdAt,
            user_id: userId,
          }));

          const { error: costsError } = await supabase.from('costs').insert(costRows);
          if (costsError) {
            console.error('Failed to import costs:', costsError);
          }
        }

        // ── Import orders ───────────────────────────────────────────
        if (data.orders && data.orders.length > 0) {
          const orderRows = data.orders.map((o) => ({
            product_id: productIdMap.get(o.productId) ?? o.productId,
            product_name: o.productName,
            option_id: o.optionId ? optionIdMap.get(o.optionId) ?? null : null,
            option_name: o.optionName ?? null,
            quantity: o.quantity,
            sell_price: o.sellPrice,
            total_amount: o.totalAmount,
            buy_cost: o.buyCost ?? null,
            platform: o.platform,
            customer_name: o.customerName ?? null,
            notes: o.notes ?? null,
            date: o.date.split('T')[0],
            created_at: o.createdAt,
            user_id: userId,
          }));

          const { error: ordersError } = await supabase.from('orders').insert(orderRows);
          if (ordersError) {
            console.error('Failed to import orders:', ordersError);
          }
        }

        resolve(true);
      } catch {
        reject(new Error('Invalid backup file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
