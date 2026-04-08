import { supabase } from '@/lib/supabase';
import { HealthPerson } from '@/features/health/lib/healthData';

export type AppointmentRow = {
  id: string;
  person: HealthPerson;
  category: string;
  date: string; // YYYY-MM-DD
  clinic: string | null;
  doctor: string | null;
  note: string | null;
};

export type CholesterolRow = {
  id: string;
  person: HealthPerson;
  year: number;
  entryOrder: number;
  total: number | null;
  hdl: number | null;
  ldl: number | null;
  triglycerides: number | null;
};

export type HealthCategoryGroups = {
  consultas: string[];
  exames: string[];
};

export async function loadAppointments(person: HealthPerson): Promise<AppointmentRow[]> {
  const { data, error } = await supabase
    .from('health_appointments')
    .select('id, person, category, date, clinic, doctor, note')
    .eq('person', person)
    .order('date', { ascending: true });

  if (error) throw new Error(`Failed to load appointments: ${error.message}`);
  return (data ?? []) as AppointmentRow[];
}

export async function upsertAppointment(input: {
  person: HealthPerson;
  category: string;
  date: string; // YYYY-MM-DD
  clinic: string | null;
  doctor: string | null;
  note: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('health_appointments')
    .upsert(
      {
        person: input.person,
        category: input.category,
        date: input.date,
        clinic: input.clinic,
        doctor: input.doctor,
        note: input.note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'person,category,date' },
    );

  if (error) throw new Error(`Failed to save appointment: ${error.message}`);
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('health_appointments')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete appointment: ${error.message}`);
}

export async function loadCholesterolEntries(person: HealthPerson): Promise<CholesterolRow[]> {
  const { data, error } = await supabase
    .from('health_cholesterol_entries')
    .select('id, person, year, entry_order, total, hdl, ldl, triglycerides')
    .eq('person', person)
    .order('year', { ascending: false })
    .order('entry_order', { ascending: true });

  if (error) throw new Error(`Failed to load cholesterol entries: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    person: row.person as HealthPerson,
    year: row.year,
    entryOrder: row.entry_order,
    total: row.total,
    hdl: row.hdl,
    ldl: row.ldl,
    triglycerides: row.triglycerides,
  }));
}

export async function saveCholesterolEntry(input: {
  id?: string;
  person: HealthPerson;
  year: number;
  entryOrder: number;
  total: number | null;
  hdl: number | null;
  ldl: number | null;
  triglycerides: number | null;
}): Promise<void> {
  const payload = {
    person: input.person,
    year: input.year,
    entry_order: input.entryOrder,
    total: input.total,
    hdl: input.hdl,
    ldl: input.ldl,
    triglycerides: input.triglycerides,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from('health_cholesterol_entries')
      .update(payload)
      .eq('id', input.id);

    if (error) throw new Error(`Failed to update cholesterol entry: ${error.message}`);
    return;
  }

  const { error } = await supabase
    .from('health_cholesterol_entries')
    .insert(payload);

  if (error) throw new Error(`Failed to insert cholesterol entry: ${error.message}`);
}

export async function deleteCholesterolEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('health_cholesterol_entries')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete cholesterol entry: ${error.message}`);
}

export async function loadCategoryOrder(person: HealthPerson): Promise<string[]> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('health_category_order')
    .eq('id', 'global')
    .single();

  if (error) {
    console.warn(`Failed to load category order: ${error.message}`);
    return [];
  }

  const orders = (data?.health_category_order ?? {}) as Record<string, string[]>;
  return orders[person] ?? [];
}

export async function saveCategoryOrder(person: HealthPerson, order: string[]): Promise<void> {
  // Load current settings
  const { data: current, error: loadError } = await supabase
    .from('app_settings')
    .select('health_category_order')
    .eq('id', 'global')
    .single();

  if (loadError) throw new Error(`Failed to load current settings: ${loadError.message}`);

  const orders = (current?.health_category_order ?? {}) as Record<string, string[]>;
  orders[person] = order;

  const { error } = await supabase
    .from('app_settings')
    .update({ health_category_order: orders, updated_at: new Date().toISOString() })
    .eq('id', 'global');

  if (error) throw new Error(`Failed to save category order: ${error.message}`);
}

export async function loadCategoryGroups(person: HealthPerson): Promise<HealthCategoryGroups> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('health_category_groups')
    .eq('id', 'global')
    .single();

  if (error) {
    console.warn(`Failed to load category groups: ${error.message}`);
    return { consultas: [], exames: [] };
  }

  const groupsByPerson = (data?.health_category_groups ?? {}) as Record<string, Partial<HealthCategoryGroups>>;
  const personGroups = groupsByPerson[person] ?? {};

  return {
    consultas: Array.isArray(personGroups.consultas) ? personGroups.consultas : [],
    exames: Array.isArray(personGroups.exames) ? personGroups.exames : [],
  };
}

export async function saveCategoryGroups(person: HealthPerson, groups: HealthCategoryGroups): Promise<void> {
  const { data: current, error: loadError } = await supabase
    .from('app_settings')
    .select('health_category_groups')
    .eq('id', 'global')
    .single();

  if (loadError) throw new Error(`Failed to load current category groups: ${loadError.message}`);

  const groupsByPerson = (current?.health_category_groups ?? {}) as Record<string, HealthCategoryGroups>;
  groupsByPerson[person] = groups;

  const { error } = await supabase
    .from('app_settings')
    .update({ health_category_groups: groupsByPerson, updated_at: new Date().toISOString() })
    .eq('id', 'global');

  if (error) throw new Error(`Failed to save category groups: ${error.message}`);
}
