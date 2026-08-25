from datetime import date
import json
import streamlit as st
import pandas as pd

from db import (
    get_fields, get_evaluations, get_evaluation, find_latest_by_document,
    insert_evaluation, update_evaluation, save_field, audit
)
from logic import age_from_birth, bmi, interpret
from ui import render_field, mobile_css

st.set_page_config(
    page_title="Senior Fitness Test INDER",
    page_icon="🏃",
    layout="centered",
    initial_sidebar_state="collapsed"
)
mobile_css()

# ---------- acceso simple ----------
if "access_ok" not in st.session_state:
    st.session_state.access_ok = False

if not st.session_state.access_ok:
    st.title("Senior Fitness Test INDER")
    st.caption("Versión móvil · Python · nube")
    password = st.text_input("Clave de acceso", type="password")
    if st.button("Ingresar"):
        if password == st.secrets["APP_PASSWORD"]:
            st.session_state.access_ok = True
            st.rerun()
        else:
            st.error("Clave incorrecta.")
    st.stop()

# ---------- navegación ----------
st.title("Senior Fitness Test INDER")
page = st.radio(
    "Menú",
    ["📝 Nueva valoración", "☁️ Registros", "✏️ Editar registro", "⚙️ Campos"],
    horizontal=False,
    label_visibility="collapsed"
)

def grouped_fields():
    fields = get_fields(active_only=True)
    groups = {}
    for f in fields:
        groups.setdefault(f.get("grupo") or "Otros", []).append(f)
    return groups

def validate_required(fields, values):
    missing = []
    for f in fields:
        if f.get("requerido") and values.get(f["clave"]) in (None, "", False):
            missing.append(f["etiqueta"])
    return missing

# ---------- nueva valoración ----------
if page == "📝 Nueva valoración":
    st.subheader("Nueva valoración")
    st.caption("Cada guardado se registra directamente en la base de datos en la nube.")

    with st.form("new_eval"):
        documento = st.text_input("Número de documento *")
        nombres = st.text_input("Nombres y apellidos *")
        fecha_nacimiento = st.date_input(
            "Fecha de nacimiento *",
            value=date(1960, 1, 1),
            min_value=date(1900, 1, 1),
            max_value=date.today()
        )
        sexo = st.selectbox("Sexo para baremos *", ["F", "M"])

        values = {}
        all_fields = []
        for group, fields in grouped_fields().items():
            st.markdown(f"### {group}")
            for f in fields:
                all_fields.append(f)
                values[f["clave"]] = render_field(f, key_prefix="new_")

        consentimiento = st.checkbox(
            "Se obtuvo el consentimiento informado requerido por el protocolo institucional. *"
        )
        guardar = st.form_submit_button("Guardar valoración")

    if guardar:
        missing = []
        if not documento.strip():
            missing.append("Número de documento")
        if not nombres.strip():
            missing.append("Nombres y apellidos")
        missing += validate_required(all_fields, values)
        if not consentimiento:
            missing.append("Consentimiento informado")

        age = age_from_birth(fecha_nacimiento)
        if age is not None and age < 60:
            missing.append("Edad mínima: 60 años")

        if missing:
            st.error("Faltan o no cumplen: " + ", ".join(missing))
        else:
            # Cálculos simples que se guardan junto a los datos flexibles
            if values.get("peso_kg") is not None and values.get("talla_m") is not None:
                values["imc"] = bmi(values.get("peso_kg"), values.get("talla_m"))

            interpretation = interpret(values, sexo, age)
            row = {
                "documento": documento.strip(),
                "nombres": nombres.strip(),
                "fecha_nacimiento": fecha_nacimiento.isoformat(),
                "sexo": sexo,
                "edad": age,
                "datos": values,
                "interpretacion": interpretation,
                "consentimiento": True
            }
            saved = insert_evaluation(row)
            audit("crear_evaluacion", saved["id"], {"documento": documento.strip()})
            st.success("Valoración guardada en la nube.")
            if interpretation:
                st.markdown("### Interpretación automática")
                for item in interpretation.values():
                    st.write(f"**{item.get('prueba')}** · {item.get('estado','')} · {item.get('rango','')}")

# ---------- registros ----------
elif page == "☁️ Registros":
    st.subheader("Registros en la nube")
    rows = get_evaluations()
    if not rows:
        st.info("Aún no hay registros.")
    else:
        compact = []
        for r in rows:
            compact.append({
                "id": r["id"],
                "fecha": r.get("created_at"),
                "documento": r.get("documento"),
                "nombres": r.get("nombres"),
                "edad": r.get("edad"),
                "sexo": r.get("sexo")
            })
        df = pd.DataFrame(compact)
        st.dataframe(df, use_container_width=True, hide_index=True)
        st.download_button(
            "Descargar CSV",
            df.to_csv(index=False).encode("utf-8-sig"),
            "SFT_INDER_registros.csv",
            "text/csv"
        )

# ---------- editar ----------
elif page == "✏️ Editar registro":
    st.subheader("Editar un registro")
    documento = st.text_input("Documento del participante")
    buscar = st.button("Buscar último registro")

    if buscar and documento.strip():
        found = find_latest_by_document(documento.strip())
        if found:
            st.session_state.edit_id = found["id"]
        else:
            st.warning("No se encontró un registro.")

    eid = st.session_state.get("edit_id")
    if eid:
        row = get_evaluation(eid)
        if not row:
            st.warning("Registro no disponible.")
        else:
            current = row.get("datos") or {}
            fields = get_fields(active_only=True)
            with st.form("edit_eval"):
                nombres = st.text_input("Nombres y apellidos", value=row.get("nombres") or "")
                sexo_opts = ["F", "M"]
                sexo = st.selectbox(
                    "Sexo para baremos",
                    sexo_opts,
                    index=sexo_opts.index(row.get("sexo")) if row.get("sexo") in sexo_opts else 0
                )
                values = {}
                current_group = None
                for f in fields:
                    if f.get("grupo") != current_group:
                        current_group = f.get("grupo")
                        st.markdown(f"### {current_group}")
                    values[f["clave"]] = render_field(
                        f, value=current.get(f["clave"]), key_prefix=f"edit_{eid}_"
                    )
                actualizar = st.form_submit_button("Guardar cambios")

            if actualizar:
                if values.get("peso_kg") is not None and values.get("talla_m") is not None:
                    values["imc"] = bmi(values.get("peso_kg"), values.get("talla_m"))
                age = row.get("edad")
                interpretation = interpret(values, sexo, age)
                update_evaluation(eid, {
                    "nombres": nombres.strip(),
                    "sexo": sexo,
                    "datos": values,
                    "interpretacion": interpretation
                })
                audit("editar_evaluacion", eid, {"documento": row.get("documento")})
                st.success("Registro actualizado en la nube.")

# ---------- campos ----------
elif page == "⚙️ Campos":
    st.subheader("Configurar campos")
    st.caption(
        "Esta pantalla permite agregar, renombrar, ordenar, activar o desactivar campos "
        "sin modificar la estructura de la base de datos."
    )

    fields = get_fields(active_only=False)
    if fields:
        st.dataframe(
            pd.DataFrame(fields)[["id","grupo","orden","clave","etiqueta","tipo","unidad","requerido","activo"]],
            use_container_width=True,
            hide_index=True
        )

    st.markdown("### Agregar campo")
    with st.form("add_field"):
        clave = st.text_input("Clave técnica", help="Ej.: observacion_equilibrio. No cambiar una vez creada.")
        etiqueta = st.text_input("Nombre visible")
        grupo = st.text_input("Grupo", value="Otros")
        tipo = st.selectbox("Tipo", ["texto","texto_largo","numero","entero","seleccion","checkbox"])
        unidad = st.text_input("Unidad")
        opciones_txt = st.text_input("Opciones separadas por |", help="Solo para tipo selección")
        requerido = st.checkbox("Obligatorio")
        activo = st.checkbox("Activo", value=True)
        orden = st.number_input("Orden", min_value=1, value=100, step=1)
        add = st.form_submit_button("Agregar campo")

    if add:
        if not clave.strip() or not etiqueta.strip():
            st.error("Clave y nombre visible son obligatorios.")
        else:
            opciones = [x.strip() for x in opciones_txt.split("|") if x.strip()]
            try:
                save_field({
                    "clave": clave.strip(),
                    "etiqueta": etiqueta.strip(),
                    "grupo": grupo.strip() or "Otros",
                    "tipo": tipo,
                    "unidad": unidad.strip() or None,
                    "opciones": opciones,
                    "requerido": requerido,
                    "activo": activo,
                    "orden": int(orden)
                })
                st.success("Campo creado. Aparecerá en las nuevas valoraciones.")
                st.rerun()
            except Exception as e:
                st.error(f"No fue posible crear el campo: {e}")

    st.markdown("### Activar, desactivar o renombrar")
    if fields:
        selected_id = st.selectbox(
            "Campo",
            [f["id"] for f in fields],
            format_func=lambda x: next((f"{f['grupo']} · {f['etiqueta']}" for f in fields if f["id"] == x), str(x))
        )
        f = next(x for x in fields if x["id"] == selected_id)
        with st.form("edit_field"):
            new_label = st.text_input("Nombre visible", value=f["etiqueta"])
            new_group = st.text_input("Grupo", value=f.get("grupo") or "Otros")
            new_required = st.checkbox("Obligatorio", value=bool(f.get("requerido")))
            new_active = st.checkbox("Activo", value=bool(f.get("activo")))
            new_order = st.number_input("Orden", min_value=1, value=int(f.get("orden") or 100), step=1)
            save = st.form_submit_button("Guardar configuración")
        if save:
            save_field({
                "id": selected_id,
                "etiqueta": new_label,
                "grupo": new_group,
                "requerido": new_required,
                "activo": new_active,
                "orden": int(new_order)
            })
            st.success("Campo actualizado.")
            st.rerun()

st.divider()
st.caption(
    "Versión móvil simplificada. Los datos se almacenan en Supabase. "
    "No publique claves de Supabase en GitHub."
)
