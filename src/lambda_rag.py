import os, json, statistics, requests, time, decimal
from decimal import Decimal, ROUND_HALF_UP

GEMINI_KEY   = os.environ["GEMINI_API_KEY"]
PINECONE_KEY = os.environ["PINECONE_API_KEY"]
PINECONE_URL = os.environ["PINECONE_INDEX_URL"].rstrip("/")
ROUND_TO     = Decimal("0.01")
DEFAULT_TOPK = 8                     # nº de partidas históricas a comparar

# ───────────────────────── helpers ─────────────────────────
def gemini_embed(text: str) -> list[float]:
    url = ("https://generativelanguage.googleapis.com/v1beta/models/"
           f"text-embedding-004:embedContent?key={GEMINI_KEY}")
    payload = {"content": {"parts": [{"text": text}]},
               "taskType": "RETRIEVAL_QUERY"}
    r = requests.post(url, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()["embedding"]["values"]

def pinecone_query(vector, k: int):
    body = {"vector": vector, "topK": k, "includeMetadata": True}
    r = requests.post(f"{PINECONE_URL}/query",
                      headers={"Api-Key": PINECONE_KEY,
                               "Content-Type": "application/json"},
                      json=body, timeout=30)
    r.raise_for_status()
    return r.json().get("matches", [])

def median_without_zeros(values):
    v = [x for x in values if x]
    return statistics.median(v) if v else 0.0

def eur(x) -> float:
    try:
        return float(Decimal(str(x)).quantize(ROUND_TO,
                                              rounding=ROUND_HALF_UP))
    except (decimal.InvalidOperation, TypeError):
        return 0.0

# ─────────────────── enrich single item ───────────────────
def enrich_item(item: dict,
                k: int,
                target_rate: float,
                margin_pct: float) -> dict:
    vec     = gemini_embed(item["description"])
    matches = pinecone_query(vec, k)

    venta_unit    = [m["metadata"].get("venta_unit",    0) for m in matches]
    coste_unit    = [m["metadata"].get("coste_unit",    0) for m in matches]
    horas_unit    = [m["metadata"].get("horas_unit",    0) for m in matches]
    material_unit = [m["metadata"].get("material_unit", 0) for m in matches]

    suppliers     = [m["metadata"].get("supplier", "")
                     for m in matches if m["metadata"].get("supplier")]

    horas_med     = median_without_zeros(horas_unit)
    material_med  = eur(median_without_zeros(material_unit))
    coste_med     = eur(median_without_zeros(coste_unit))

    precio_obj    = eur(horas_med * target_rate +
                        material_med * (1 + margin_pct / 100))
    profit_unit   = eur(precio_obj - coste_med - material_med)
    rentab_hora   = eur(profit_unit / horas_med) if horas_med else 0.0

    top_matches = []
    for m in matches:
        h_u   = m["metadata"].get("horas_unit", 0)
        mat_u = m["metadata"].get("material_unit", 0)
        cost  = m["metadata"].get("coste_unit", 0)
        desc_pre_val = m["metadata"].get("desc_pre", "")
        desc_ppy_val = m["metadata"].get("desc_ppy", "")
        combined_desc = f"{desc_pre_val} || {desc_ppy_val}".strip(" |")

        calc_price = eur(h_u * target_rate + mat_u * (1 + margin_pct / 100))
        top_matches.append({
            "code":          m["metadata"].get("code", ""),
            "desc":          combined_desc,
            "horas_unit":    h_u,
            "material_unit": mat_u,
            "venta_unit":    m["metadata"].get("venta_unit", 0),
            "coste_unit":    cost,
            "calc_price":    calc_price,
            "profit_unit":   eur(calc_price - cost - mat_u),
            "rentab_hora":   eur((calc_price - cost - mat_u) / h_u) if h_u else 0,
            "supplier":      m["metadata"].get("supplier", ""),
            "similarityPct": round(m["score"] * 100, 2),
        })

    return {
        **item,
        "optimizedPrice": precio_obj or item["currentPrice"],
        "hoursUnit":      horas_med,
        "materialUnit":   material_med,
        "profitUnit":     profit_unit,
        "rentHour":       rentab_hora,
        "savings":        eur(item["currentPrice"] - precio_obj) if precio_obj else 0,
        "suggestedCost":  coste_med,
        "supplier":       max(set(suppliers), key=suppliers.count) if suppliers else "",
        "similar":        top_matches,
    }

# ───────────────────── lambda handler ─────────────────────
def lambda_handler(event, context):
    try:
        body             = json.loads(event.get("body", "{}"))
        items            = body["items"]
        target_rate      = float(body.get("targetRate", 50))
        margin_pct       = float(body.get("materialsMargin", 30))
    except Exception as e:
        return _resp(400, f"Body inválido: {e}")

    t0        = time.time()
    enriched  = [enrich_item(it, DEFAULT_TOPK, target_rate, margin_pct)
                 for it in items]

    total_orig     = sum(it["quantity"] * it["currentPrice"]   for it in enriched)
    total_opt      = sum(it["quantity"] * it["optimizedPrice"] for it in enriched)
    total_hours    = sum(it["quantity"] * it["hoursUnit"]      for it in enriched)
    total_profit   = sum(it["quantity"] * it["profitUnit"]     for it in enriched)
    total_save     = eur(total_orig - total_opt)
    pct_save       = eur(100 * total_save / total_orig) if total_orig else 0.0
    rentab_global  = eur(total_profit / total_hours) if total_hours else 0.0

    result = {
        "items":          enriched,
        "totalOriginal":  eur(total_orig),
        "totalOptimized": eur(total_opt),
        "totalSavings":   total_save,
        "savingsPercent": pct_save,
        "totalHours":     round(total_hours, 2),
        "totalProfit":    eur(total_profit),
        "profitPerHour":  rentab_global,
        "elapsedSec":     round(time.time() - t0, 2),
    }
    return _resp(200, result)

# ──────────────────── http response ──────────────────────
def _resp(code, body):
    return {
        "statusCode": code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=float),
    }
