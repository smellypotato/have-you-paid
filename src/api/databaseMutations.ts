/**
 * Mutations routed through the `app-api` Edge Function (`supabase/functions/app-api`).
 * Reads (select) and Storage uploads remain on `supabase` client side.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type MutationErrorPayload = {
  ok: false
  message: string
  code?: string
}

export type HostBillCreatedPayload = {
  ok: true
  session_id: string
}

type InvokeEnvelope = MutationErrorPayload | ({ ok: true } & Record<string, unknown>)

/** Thrown when the Edge Function returns `{ ok: false, message, code? }`. */
export class MutationRejectedError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'MutationRejectedError'
    this.code = code
  }
}

async function invokeMutation(
  supabase: SupabaseClient,
  op: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } & Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke<InvokeEnvelope>('app-api', {
    body: { op, payload },
  })

  if (error) throw error

  if (!data || typeof data !== 'object') {
    throw new Error('Empty response from app-api')
  }

  const body = data as InvokeEnvelope
  if ('ok' in body && body.ok === false) {
    const m = body as MutationErrorPayload
    throw new MutationRejectedError(m.message, m.code)
  }

  return body as { ok: true } & Record<string, unknown>
}

/** True when the mutation failed with a unique-violation (e.g. race joining the same session). */
export function isMutationPostgresDup(e: unknown): boolean {
  return e instanceof MutationRejectedError && e.code === '23505'
}

export async function mutationProfileSaveDisplayName(
  supabase: SupabaseClient,
  payload: { display_name: string },
): Promise<void> {
  await invokeMutation(supabase, 'profile_save_display_name', payload)
}

export async function mutationHostBillCreate(supabase: SupabaseClient, payload: { title: string }) {
  const data = await invokeMutation(supabase, 'host_bill_create', payload)
  const session_id = typeof data.session_id === 'string' ? data.session_id : null
  if (!session_id) throw new Error('host_bill_create: missing session_id')
  return { session_id } as HostBillCreatedPayload
}

export async function mutationParticipantJoinGuest(
  supabase: SupabaseClient,
  payload: { session_id: string },
): Promise<void> {
  await invokeMutation(supabase, 'participant_join_guest', payload)
}

export async function mutationSessionSetReceiptPath(
  supabase: SupabaseClient,
  payload: { session_id: string; receipt_storage_path: string },
): Promise<void> {
  await invokeMutation(supabase, 'session_set_receipt_path', payload)
}

export async function mutationSplitItemCreate(
  supabase: SupabaseClient,
  payload: {
    session_id: string
    slot_count: number
    anchor_x: number
    anchor_y: number
    label: string | null
  },
): Promise<void> {
  await invokeMutation(supabase, 'split_item_create', {
    session_id: payload.session_id,
    slot_count: payload.slot_count,
    anchor_x: payload.anchor_x,
    anchor_y: payload.anchor_y,
    label: payload.label,
  })
}

export async function mutationSplitItemHostEdit(
  supabase: SupabaseClient,
  payload: {
    split_item_id: string
    slot_count: number
    label: string | null
    clear_claims: boolean
  },
): Promise<void> {
  await invokeMutation(supabase, 'split_item_host_edit', {
    split_item_id: payload.split_item_id,
    slot_count: payload.slot_count,
    label: payload.label,
    clear_claims: payload.clear_claims,
  })
}

export async function mutationSplitItemDelete(supabase: SupabaseClient, payload: { split_item_id: string }) {
  await invokeMutation(supabase, 'split_item_delete', payload)
}

export async function mutationSlotClaimUpsert(
  supabase: SupabaseClient,
  payload: { split_item_id: string; slot_index: number },
) {
  await invokeMutation(supabase, 'slot_claim_upsert', payload)
}

export async function mutationSlotClaimDeleteById(supabase: SupabaseClient, payload: { claim_id: string }) {
  await invokeMutation(supabase, 'slot_claim_delete_by_id', payload)
}

export async function mutationSessionUpdateTitle(
  supabase: SupabaseClient,
  payload: { session_id: string; title: string | null },
) {
  await invokeMutation(supabase, 'session_update_title', payload)
}

export async function mutationSessionUpdateMaxGuests(
  supabase: SupabaseClient,
  payload: { session_id: string; max_guests: number | null },
) {
  await invokeMutation(supabase, 'session_update_max_guests', payload)
}

export async function mutationSessionLock(
  supabase: SupabaseClient,
  payload: { session_id: string; locked_at: string },
) {
  await invokeMutation(supabase, 'session_lock', payload)
}

export async function mutationPaymentAckUpsert(
  supabase: SupabaseClient,
  payload: { session_id: string; acknowledged_at: string },
) {
  await invokeMutation(supabase, 'payment_ack_upsert', payload)
}

export async function mutationRpcKickGuest(
  supabase: SupabaseClient,
  payload: { session_id: string; guest_user_id: string },
) {
  await invokeMutation(supabase, 'rpc_kick_guest', payload)
}

export async function mutationRpcLeaveGuest(supabase: SupabaseClient, payload: { session_id: string }) {
  await invokeMutation(supabase, 'rpc_leave_guest', payload)
}
