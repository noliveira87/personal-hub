import { supabase } from '@/lib/supabase';
import { DEFAULT_PROPERTY_DEAL_PAYLOAD, PropertyDeal } from '@/features/property-deals/lib/types';

type PropertyDealRow = {
  id: string;
  title: string;
  payload: unknown;
  created_at?: string;
  updated_at?: string;
};

const TABLE = 'property_deals';

function rowToDeal(row: PropertyDealRow): PropertyDeal {
  return {
    id: row.id,
    title: row.title,
    payload: {
      ...DEFAULT_PROPERTY_DEAL_PAYLOAD,
      ...(typeof row.payload === 'object' && row.payload != null ? row.payload : {}),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchPropertyDeals(): Promise<PropertyDeal[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as PropertyDealRow[]).map(rowToDeal);
}

export async function upsertPropertyDeal(deal: PropertyDeal): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert({
      id: deal.id,
      title: deal.title,
      payload: deal.payload,
    }, { onConflict: 'id' });

  if (error) throw error;
}

export async function deletePropertyDeal(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
}
