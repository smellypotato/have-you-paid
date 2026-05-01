// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { corsHeaders } from "../_shared/cors.ts"

type ApiBody = { op: string; payload?: Record<string, unknown> }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function err(message: string, code?: string) {
  return json({ ok: false as const, message, ...(code ? { code } : {}) })
}

async function getAuthedUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null as null, error: err("Unauthorized", "401") }
  return { user, error: null as null }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return json({ ok: false, message: "Method not allowed" }, 405)
  }

  const authHeader = req.headers.get("Authorization") ?? ""
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  )

  let body: ApiBody
  try {
    body = (await req.json()) as ApiBody
  } catch {
    return err("Invalid JSON body")
  }

  const op = body.op
  const p = body.payload ?? {}

  const { user, error: authErr } = await getAuthedUser(supabase)
  if (authErr) return authErr

  const str = (k: string) => (typeof p[k] === "string" ? p[k] as string : undefined)
  const num = (k: string) => (typeof p[k] === "number" && Number.isFinite(p[k] as number) ? p[k] as number : undefined)
  const bool = (k: string) => (typeof p[k] === "boolean" ? p[k] as boolean : undefined)

  try {
    switch (op) {
      case "profile_save_display_name": {
        const display_name = str("display_name") ?? "Guest"
        const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name })
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      case "host_bill_create": {
        const title = str("title")
        if (!title) return err("Missing title")
        const { data: sessionRow, error: sErr } = await supabase
          .from("sessions")
          .insert({ host_user_id: user.id, title })
          .select("id")
          .single()
        if (sErr || !sessionRow) return err(sErr?.message ?? "Failed to create session", sErr?.code)
        const session_id = sessionRow.id as string
        const { error: pErr } = await supabase.from("session_participants").insert({
          session_id,
          user_id: user.id,
          role: "host",
        })
        if (pErr) return err(pErr.message, pErr.code)
        return json({ ok: true as const, session_id })
      }

      case "participant_join_guest": {
        const session_id = str("session_id")
        if (!session_id) return err("Missing session_id")
        const { error } = await supabase.from("session_participants").insert({
          session_id,
          user_id: user.id,
          role: "guest",
        })
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      case "session_set_receipt_path": {
        const session_id = str("session_id")
        const receipt_storage_path = str("receipt_storage_path")
        if (!session_id || !receipt_storage_path) return err("Missing session_id or receipt_storage_path")
        const { error } = await supabase
          .from("sessions")
          .update({ receipt_storage_path })
          .eq("id", session_id)
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      case "split_item_create": {
        const session_id = str("session_id")
        const slot_count = num("slot_count")
        const anchor_x = num("anchor_x")
        const anchor_y = num("anchor_y")
        const labelRaw = p.label
        let label: string | null
        if (labelRaw === undefined || labelRaw === null) label = null
        else if (typeof labelRaw === "string") label = labelRaw
        else return err("Invalid label")
        if (!session_id || slot_count == null || anchor_x == null || anchor_y == null) {
          return err("Missing split item fields")
        }
        const { error } = await supabase.from("split_items").insert({
          session_id,
          slot_count,
          anchor_x,
          anchor_y,
          label,
        })
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      case "split_item_host_edit": {
        const split_item_id = str("split_item_id")
        const slot_count = num("slot_count")
        const labelRaw = p.label
        let label: string | null
        if (labelRaw === undefined || labelRaw === null) label = null
        else if (typeof labelRaw === "string") label = labelRaw
        else return err("Invalid label")
        const clear_claims = bool("clear_claims")
        if (!split_item_id || slot_count == null || clear_claims == null) return err("Missing host edit fields")
        if (clear_claims) {
          const { error: delErr } = await supabase
            .from("split_item_slot_claims")
            .delete()
            .eq("split_item_id", split_item_id)
          if (delErr) return err(delErr.message, delErr.code)
        }
        const { error: upErr } = await supabase.from("split_items").update({ slot_count, label }).eq("id", split_item_id)
        if (upErr) return err(upErr.message, upErr.code)
        return json({ ok: true as const })
      }

      case "split_item_delete": {
        const split_item_id = str("split_item_id")
        if (!split_item_id) return err("Missing split_item_id")
        const { error } = await supabase.from("split_items").delete().eq("id", split_item_id)
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      case "slot_claim_upsert": {
        const split_item_id = str("split_item_id")
        const slot_index = num("slot_index")
        if (!split_item_id || slot_index == null) return err("Missing slot claim fields")
        const { error } = await supabase.from("split_item_slot_claims").upsert(
          {
            split_item_id,
            slot_index,
            claimed_by_user_id: user.id,
          },
          { onConflict: "split_item_id,slot_index", ignoreDuplicates: true },
        )
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      case "slot_claim_delete_by_id": {
        const claim_id = str("claim_id")
        if (!claim_id) return err("Missing claim_id")
        const { error } = await supabase.from("split_item_slot_claims").delete().eq("id", claim_id)
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      case "session_update_title": {
        const session_id = str("session_id")
        const titleRaw = p.title
        let title: string | null
        if (titleRaw === undefined || titleRaw === null) title = null
        else if (typeof titleRaw === "string") title = titleRaw
        else return err("Invalid title")
        if (!session_id) return err("Missing session_id")
        const { error } = await supabase.from("sessions").update({ title }).eq("id", session_id)
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      case "session_update_max_guests": {
        const session_id = str("session_id")
        if (!("max_guests" in p)) return err("Missing max_guests")
        const rawMg = p.max_guests
        let max_guests: number | null
        if (rawMg === null) max_guests = null
        else if (typeof rawMg === "number" && Number.isFinite(rawMg)) max_guests = rawMg
        else return err("Invalid max_guests")
        if (!session_id) return err("Missing session_id")
        const { error } = await supabase.from("sessions").update({ max_guests }).eq("id", session_id)
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      case "session_lock": {
        const session_id = str("session_id")
        const locked_at = str("locked_at")
        if (!session_id || !locked_at) return err("Missing session_lock fields")
        const { error } = await supabase
          .from("sessions")
          .update({ status: "locked", locked_at })
          .eq("id", session_id)
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      case "payment_ack_upsert": {
        const session_id = str("session_id")
        const acknowledged_at = str("acknowledged_at")
        if (!session_id || !acknowledged_at) return err("Missing payment_ack fields")
        const { error } = await supabase.from("payment_acknowledgements").upsert(
          {
            session_id,
            user_id: user.id,
            acknowledged_at,
          },
          { onConflict: "session_id,user_id" },
        )
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      case "rpc_kick_guest": {
        const session_id = str("session_id")
        const guest_user_id = str("guest_user_id")
        if (!session_id || !guest_user_id) return err("Missing kick fields")
        const { error } = await supabase.rpc("kick_session_guest", {
          p_session_id: session_id,
          p_guest_user_id: guest_user_id,
        })
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      case "rpc_leave_guest": {
        const session_id = str("session_id")
        if (!session_id) return err("Missing session_id")
        const { error } = await supabase.rpc("leave_session_as_guest", { p_session_id: session_id })
        if (error) return err(error.message, error.code)
        return json({ ok: true as const })
      }

      default:
        return err(`Unknown op: ${op}`)
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error"
    return err(message)
  }
})
