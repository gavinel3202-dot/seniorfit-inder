import json
import streamlit as st
from supabase import create_client

@st.cache_resource
def client():
    url = st.secrets["SUPABASE_URL"]
    key = st.secrets["SUPABASE_KEY"]
    return create_client(url, key)

def get_fields(active_only=True):
    q = client().table("campos").select("*").order("grupo").order("orden")
    if active_only:
        q = q.eq("activo", True)
    return q.execute().data or []

def save_field(row):
    if row.get("id"):
        fid = row.pop("id")
        return client().table("campos").update(row).eq("id", fid).execute()
    return client().table("campos").insert(row).execute()

def get_evaluations(limit=500):
    return (
        client().table("evaluaciones")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
        .data or []
    )

def get_evaluation(eid):
    rows = client().table("evaluaciones").select("*").eq("id", eid).limit(1).execute().data or []
    return rows[0] if rows else None

def find_latest_by_document(documento):
    rows = (
        client().table("evaluaciones")
        .select("*")
        .eq("documento", documento)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data or []
    )
    return rows[0] if rows else None

def insert_evaluation(row):
    return client().table("evaluaciones").insert(row).execute().data[0]

def update_evaluation(eid, row):
    return client().table("evaluaciones").update(row).eq("id", eid).execute().data[0]

def delete_evaluation(eid):
    return client().table("evaluaciones").delete().eq("id", eid).execute()

def audit(action, evaluation_id=None, details=None):
    try:
        client().table("auditoria").insert({
            "accion": action,
            "evaluation_id": evaluation_id,
            "detalles": details or {}
        }).execute()
    except Exception:
        # La auditoría no debe impedir el trabajo de campo si falla de forma aislada.
        pass
