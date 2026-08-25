from datetime import date, datetime
from pathlib import Path
import pandas as pd

BASE = Path(__file__).resolve().parent
BAREMOS = BASE / "data" / "baremos_normal.csv"
CRITERIOS = BASE / "data" / "criterios_mantenimiento.csv"

def age_from_birth(birth):
    if not birth:
        return None
    if isinstance(birth, str):
        birth = date.fromisoformat(birth)
    today = date.today()
    return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))

def age_group(age):
    if age is None or age < 60 or age > 94:
        return None
    start = 60 + ((age - 60) // 5) * 5
    return f"{start}-{min(start + 4, 94)}"

def bmi(weight, height):
    try:
        return round(float(weight) / (float(height) ** 2), 2) if float(height) > 0 else None
    except Exception:
        return None

def cm_to_inches(v):
    return None if v is None else float(v) / 2.54

def meters_to_yards(v):
    return None if v is None else float(v) * 1.0936132983

def _reference_value(key, value):
    if value is None:
        return None
    if key == "six_min_walk":
        return meters_to_yards(value)
    if key in ("chair_sit_reach", "back_scratch"):
        return cm_to_inches(value)
    return float(value)

def classify(key, value, sex, age):
    if value in (None, ""):
        return None
    group = age_group(age)
    if not group:
        return {"estado": "Sin baremo 60-94"}
    df = pd.read_csv(BAREMOS)
    row = df[(df.prueba == key) & (df.sexo == sex) & (df.rango_edad == group)]
    if row.empty:
        return None
    r = row.iloc[0]
    v = _reference_value(key, value)
    lo, hi = float(r.limite_inferior), float(r.limite_superior)
    if key == "eight_foot_up_go":
        estado = "Superior" if v < lo else ("Normal" if v <= hi else "Bajo")
    else:
        estado = "Bajo" if v < lo else ("Normal" if v <= hi else "Superior")
    return {
        "estado": estado,
        "valor_referencia": round(v, 2),
        "rango": f"{lo} a {hi} {r.unidad_referencia}",
        "grupo_edad": group
    }

KNOWN_SFT_KEYS = {
    "chair_stand": "Chair Stand",
    "arm_curl": "Arm Curl",
    "two_min_step": "Marcha 2 minutos",
    "six_min_walk": "Caminata 6 minutos",
    "chair_sit_reach": "Chair Sit-and-Reach",
    "back_scratch": "Back Scratch",
    "eight_foot_up_go": "8-Foot Up-and-Go",
}

def interpret(datos, sex, age):
    result = {}
    for key, label in KNOWN_SFT_KEYS.items():
        if key in datos and datos.get(key) not in (None, ""):
            result[key] = {"prueba": label, **(classify(key, datos.get(key), sex, age) or {})}
    return result
