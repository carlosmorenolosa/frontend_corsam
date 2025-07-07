import os, json, statistics, requests, time, decimal
from decimal import Decimal, ROUND_HALF_UP
import boto3
from datetime import datetime

# ─────── env / límites ───────
GEMINI_KEY   = os.environ["GEMINI_API_KEY"]
PINECONE_KEY = os.environ["PINECONE_API_KEY"]
PINECONE_URL = os.environ["PINECONE_INDEX_URL"].rstrip("/")
ROUND_TO     = Decimal("0.01")
DEFAULT_TOPK = 6               # para pruebas; en prod pon 6

DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE_NAME", "corsam_usage_counter")
MAX_MONTH      = int(os.environ.get("MAX_MONTHLY_USES", 20))
usage_table    = boto3.resource("dynamodb").Table(DYNAMODB_TABLE)

# ─────── uso mensual ────────
_now_month = lambda: datetime.now().strftime("%Y-%m")
get_use    = lambda: usage_table.get_item(Key={"month_year": _now_month()}).get("Item", {}).get("count", 0)
def inc_use():
    r = usage_table.update_item(
        Key={"month_year": _now_month()},
        UpdateExpression="ADD #c :v",
        ExpressionAttributeNames={"#c": "count"},
        ExpressionAttributeValues={":v": 1},
        ReturnValues="UPDATED_NEW")
    return r["Attributes"]["count"]

# ─────── helpers ───────
def gemini_embed(txt: str) -> list[float]:
    url = ("https://generativelanguage.googleapis.com/v1beta/models/"
           f"text-embedding-004:embedContent?key={GEMINI_KEY}")
    r = requests.post(url,
        json={"content": {"parts": [{"text": txt}]},
              "taskType": "RETRIEVAL_QUERY"},
        timeout=30)
    r.raise_for_status()
    return r.json()["embedding"]["values"]

def pinecone_query(vec, k: int):
    r = requests.post(f"{PINECONE_URL}/query",
        headers={"Api-Key": PINECONE_KEY, "Content-Type": "application/json"},
        json={"vector": vec, "topK": k, "includeMetadata": True},
        timeout=30)
    r.raise_for_status()
    return r.json()["matches"]

def safe_median(vals):
    filt = [x for x in vals if x]
    return statistics.median(filt) if filt else 0.0

eur = lambda x: float(Decimal(str(x)).quantize(ROUND_TO, ROUND_HALF_UP)) if x else 0.0

# ─────── enriquecedor ───────
def enrich_item(item: dict, k: int, rate: float, margin: float) -> dict:
    matches = pinecone_query(gemini_embed(item["description"]), k)

    eff_k     = 3 if matches and matches[0]["score"] >= 0.90 else k
    eff_matches = matches[:eff_k]

    h_list    = [m["metadata"].get("horas_unit", 0)     for m in eff_matches]
    mat_list  = [m["metadata"].get("material_unit", 0)  for m in eff_matches]
    subc_list = [m["metadata"].get("contrata_unit", 0)  for m in eff_matches]
    mano_list = [m["metadata"].get("mano_obra_unit", 0) for m in eff_matches]
    cost_list = [m["metadata"].get("coste_unit", 0)     for m in eff_matches]
    venta_list= [m["metadata"].get("venta_unit", 0)     for m in eff_matches]
    benef_lst = [m["metadata"].get("rentabilidad", 0)   for m in eff_matches]

    horas_med     = eur(safe_median(h_list))
    mat_med       = eur(safe_median(mat_list))
    subc_med      = eur(safe_median(subc_list))
    mano_med      = eur(safe_median(mano_list))
    coste_med     = eur(safe_median(cost_list))
    venta_med     = eur(safe_median(venta_list))
    benef_hist_md = eur(safe_median(benef_lst))

    precio_obj  = eur(horas_med * rate + mat_med * (1 + margin / 100))
    profit_unit = eur(precio_obj - coste_med)
    rentab_h    = eur(profit_unit / horas_med) if horas_med else 0.0

    calc_prices = [eur(h * rate + m * (1 + margin / 100))
                   for h, m in zip(h_list, mat_list)]
    price_std   = eur(statistics.stdev(calc_prices)) if len(calc_prices) >= 2 else 0.0

    top_matches = []
    for m in matches:
        md = m["metadata"]; h = md.get("horas_unit", 0); m_mat = md.get("material_unit", 0)
        calc = eur(h * rate + m_mat * (1 + margin / 100))
        top_matches.append({
            "code": md.get("code", ""),
            "desc": f"{md.get('desc_pre', '')} || {md.get('desc_ppy', '')}".strip(" |"),
            "horas_unit": h,
            "material_unit": m_mat,
            "contrata_unit": md.get("contrata_unit", 0),
            "mano_obra_unit": md.get("mano_obra_unit", 0),
            "coste_unit": md.get("coste_unit", 0),
            "venta_unit": md.get("venta_unit", 0),
            "calc_price": calc,
            "profit_unit": eur(calc - md.get("coste_unit", 0)),
            "similarityPct": round(m["score"] * 100, 2),
        })

    return {
        **item,
        "optimizedPrice": precio_obj or item["currentPrice"],
        "hoursUnit":      horas_med,
        "materialUnit":   mat_med,
        "contrataUnit":   subc_med,
        "manoObraUnit":   mano_med,
        "costTotalUnit":  coste_med,
        "ventaHistUnit":  venta_med,
        "benefHistUnit":  benef_hist_md,
        "profitUnit":     profit_unit,
        "rentHour":       rentab_h,
        "priceStdDev":    price_std,
        "savings":        eur(item["currentPrice"] - precio_obj) if precio_obj else 0,
        "similar":        top_matches,
        "k_used":         eff_k
    }

# ─────── handler ───────
def lambda_handler(event, context):
    try:
        body   = json.loads(event.get("body", "{}"))
        items  = body["items"]
        rate   = float(body.get("targetRate", 50))
        margin = float(body.get("materialsMargin", 30))
    except Exception as e:
        return _resp(400, f"Body inválido: {e}")

    if get_use() >= MAX_MONTH:
        return _resp(429, {"message": "Límite mensual alcanzado"})
    if inc_use() == -1:
        return _resp(500, {"message": "Error contador uso"})

    t0 = time.time()
    enriched = [enrich_item(it, DEFAULT_TOPK, rate, margin) for it in items]

    total_orig = sum(it["quantity"] * it["currentPrice"]   for it in enriched)
    total_opt  = sum(it["quantity"] * it["optimizedPrice"] for it in enriched)
    total_hr   = sum(it["quantity"] * it["hoursUnit"]      for it in enriched)
    total_prof = sum(it["quantity"] * it["profitUnit"]     for it in enriched)

    return _resp(200, {
        "items":          enriched,
        "totalOriginal":  eur(total_orig),
        "totalOptimized": eur(total_opt),
        "totalSavings":   eur(total_orig - total_opt),
        "savingsPercent": eur(100 * (total_orig - total_opt) / total_orig) if total_orig else 0,
        "totalHours":     eur(total_hr),
        "totalProfit":    eur(total_prof),
        "profitPerHour":  eur(total_prof / total_hr) if total_hr else 0,
        "elapsedSec":     eur(time.time() - t0),
        "usage":          {"current": get_use() + 1, "max": MAX_MONTH}
    })

def _resp(code, body):
    return {
        "statusCode": code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=float),
    }
