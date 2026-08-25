import streamlit as st

def render_field(field, value=None, key_prefix=""):
    key = f"{key_prefix}{field['clave']}"
    label = field["etiqueta"] + (f" ({field['unidad']})" if field.get("unidad") else "")
    required = " *" if field.get("requerido") else ""
    label += required
    tipo = field.get("tipo", "texto")
    options = field.get("opciones") or []

    if tipo == "numero":
        default = float(value) if value not in (None, "") else 0.0
        return st.number_input(label, value=default, step=0.1, key=key)
    if tipo == "entero":
        default = int(float(value)) if value not in (None, "") else 0
        return st.number_input(label, value=default, step=1, key=key)
    if tipo == "seleccion":
        opts = options if isinstance(options, list) else []
        if not opts:
            return st.text_input(label, value=str(value or ""), key=key)
        idx = opts.index(value) if value in opts else 0
        return st.selectbox(label, opts, index=idx, key=key)
    if tipo == "checkbox":
        return st.checkbox(label, value=bool(value), key=key)
    if tipo == "texto_largo":
        return st.text_area(label, value=str(value or ""), key=key)
    return st.text_input(label, value=str(value or ""), key=key)

def mobile_css():
    st.markdown("""
    <style>
      .block-container {max-width: 760px; padding-top: 1rem; padding-bottom: 4rem;}
      html, body, [class*="css"] {font-size: 17px;}
      .stButton > button {min-height: 48px; width: 100%; font-weight: 700;}
      div[data-testid="stForm"] {border: 0; padding: 0;}
      @media (max-width: 700px) {
        .block-container {padding-left: .8rem; padding-right: .8rem;}
        h1 {font-size: 1.7rem !important;}
        h2 {font-size: 1.35rem !important;}
        .stButton > button {min-height: 52px;}
      }
    </style>
    """, unsafe_allow_html=True)
