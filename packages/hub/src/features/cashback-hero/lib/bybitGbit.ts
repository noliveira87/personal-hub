import { supabase } from '@/lib/supabase';

export type BybitGbitTransaction = {
	id: string;
	movement: string;
	amount: number;
	bank: string;
	purchaseType: string;
	date: string;
	curveCard: string;
	days: number;
	gbit: boolean;
	gbitAppliedAt?: string;
	createdAt: string;
};

type BybitGbitTransactionRow = {
	id: string;
	movement: string;
	amount: number | null;
	bank: string | null;
	purchase_type: string | null;
	date: string;
	curve_card: string | null;
	days: number | null;
	gbit: boolean | null;
	gbit_applied_at: string | null;
	created_at: string;
};

function mapRow(row: BybitGbitTransactionRow): BybitGbitTransaction {
	return {
		id: row.id,
		movement: row.movement,
		amount: Number(row.amount ?? 0),
		bank: row.bank ?? '',
		purchaseType: row.purchase_type ?? '',
		date: row.date,
		curveCard: row.curve_card ?? '',
		days: Number(row.days ?? 0),
		gbit: row.gbit ?? false,
		gbitAppliedAt: row.gbit_applied_at ?? undefined,
		createdAt: row.created_at,
	};
}

function formatSupabaseError(prefix: string, error: unknown): string {
	if (!error || typeof error !== 'object') return prefix;

	const maybe = error as {
		message?: string;
		details?: string;
		hint?: string;
		code?: string;
	};

	const parts = [maybe.message, maybe.details, maybe.hint, maybe.code].filter(Boolean);
	return parts.length > 0 ? `${prefix}: ${parts.join(' | ')}` : prefix;
}

function isMissingPurchaseTypeColumn(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false;

	const maybe = error as {
		message?: string;
		details?: string;
		hint?: string;
		code?: string;
	};

	const combined = `${maybe.message ?? ''} ${maybe.details ?? ''} ${maybe.hint ?? ''}`.toLowerCase();
	return maybe.code === 'PGRST204' || (combined.includes('purchase_type') && combined.includes('schema cache'));
}

export async function loadBybitGbitTransactions(): Promise<BybitGbitTransaction[]> {
	const { data, error } = await supabase
		.from('cashback_bybit_gbit_transactions')
		.select('*')
		.order('date', { ascending: false })
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error(formatSupabaseError('Failed to load Bybit GBIT transactions', error));
	}

	return ((data ?? []) as BybitGbitTransactionRow[]).map(mapRow);
}

export async function createBybitGbitTransaction(payload: Omit<BybitGbitTransaction, 'id' | 'createdAt'>): Promise<BybitGbitTransaction> {
	const now = new Date().toISOString();
	const id = crypto.randomUUID();
	const commonPayload = {
		id,
		movement: payload.movement,
		amount: payload.amount,
		bank: payload.bank,
		date: payload.date,
		curve_card: payload.curveCard,
		days: payload.days,
		gbit: payload.gbit,
		gbit_applied_at: payload.gbitAppliedAt ?? null,
		created_at: now,
		updated_at: now,
	};

	const insertWithPurchaseType = {
		...commonPayload,
		purchase_type: payload.purchaseType || null,
	};

	let { data, error } = await supabase
		.from('cashback_bybit_gbit_transactions')
		.insert([insertWithPurchaseType])
		.select('*')
		.single();

	if (error && isMissingPurchaseTypeColumn(error)) {
		const retry = await supabase
			.from('cashback_bybit_gbit_transactions')
			.insert([commonPayload])
			.select('*')
			.single();
		data = retry.data;
		error = retry.error;
	}

	if (error) {
		throw new Error(formatSupabaseError('Failed to create Bybit GBIT transaction', error));
	}

	return mapRow(data as BybitGbitTransactionRow);
}

export async function updateBybitGbitTransactionGbit(id: string, gbit: boolean, appliedAt?: string): Promise<void> {
	const { error } = await supabase
		.from('cashback_bybit_gbit_transactions')
		.update({ gbit, gbit_applied_at: gbit ? (appliedAt ?? new Date().toISOString().slice(0, 10)) : null, updated_at: new Date().toISOString() })
		.eq('id', id);

	if (error) {
		throw new Error(formatSupabaseError('Failed to update Bybit GBIT transaction', error));
	}
}

export async function updateBybitGbitTransaction(
	id: string,
	payload: Pick<BybitGbitTransaction, 'movement' | 'amount' | 'bank' | 'purchaseType' | 'date' | 'curveCard' | 'days'>,
): Promise<BybitGbitTransaction> {
	const commonPayload = {
		movement: payload.movement,
		amount: payload.amount,
		bank: payload.bank,
		date: payload.date,
		curve_card: payload.curveCard,
		days: payload.days,
		updated_at: new Date().toISOString(),
	};

	const updateWithPurchaseType = {
		...commonPayload,
		purchase_type: payload.purchaseType || null,
	};

	let { data, error } = await supabase
		.from('cashback_bybit_gbit_transactions')
		.update(updateWithPurchaseType)
		.eq('id', id)
		.select('*')
		.single();

	if (error && isMissingPurchaseTypeColumn(error)) {
		const retry = await supabase
			.from('cashback_bybit_gbit_transactions')
			.update(commonPayload)
			.eq('id', id)
			.select('*')
			.single();
		data = retry.data;
		error = retry.error;
	}

	if (error) {
		throw new Error(formatSupabaseError('Failed to update Bybit GBIT transaction', error));
	}

	return mapRow(data as BybitGbitTransactionRow);
}

export async function deleteBybitGbitTransaction(id: string): Promise<void> {
	const { error } = await supabase
		.from('cashback_bybit_gbit_transactions')
		.delete()
		.eq('id', id);

	if (error) {
		throw new Error(formatSupabaseError('Failed to delete Bybit GBIT transaction', error));
	}
}
