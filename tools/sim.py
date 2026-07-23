# -*- coding: utf-8 -*-
"""Simulacion economica Stock Perfecto v2 - tienda de barrio, 5 rondas."""
import numpy as np

# ---------- CATALOGO ----------
# name, cost, price, life (rondas utilizables, 99 = no perece), base weekly demand
P = [
    ("Pan",        0.50,  0.80,  1, 400),
    ("Huevo",      0.90,  1.20,  3, 180),
    ("Leche",      6.00,  7.50,  2,  60),
    ("Yogurt",    11.00, 14.00,  2,  25),
    ("Salchicha", 14.00, 18.00,  2,  20),
    ("Gaseosa2L", 11.00, 15.00, 99,  50),
    ("Agua",       2.50,  4.00, 99,  70),
    ("Galletas",   2.00,  3.00, 99,  90),
    ("Snack",      1.50,  2.50, 99, 110),
    ("Arroz",      7.50,  9.50, 99,  35),
    ("Aceite",    13.00, 16.00, 99,  20),
    ("PapelHig",  12.00, 16.00, 99,  15),
    ("Detergente", 8.00, 11.00, 99,  12),
]
n = len(P)
names = [p[0] for p in P]
cost  = np.array([p[1] for p in P])
price = np.array([p[2] for p in P])
life  = np.array([p[3] for p in P])
base  = np.array([p[4] for p in P], dtype=float)
idx = {p[0]: i for i, p in enumerate(P)}

# ---------- EVENTOS (multiplicadores por ronda) ----------
mult = np.ones((5, n))
# R2: ola de calor
mult[1, idx["Agua"]] = 1.8; mult[1, idx["Gaseosa2L"]] = 1.5
mult[1, idx["Yogurt"]] = 1.2; mult[1, idx["Leche"]] = 1.1
# R3: clasico + parrillada
mult[2, idx["Gaseosa2L"]] = 1.6; mult[2, idx["Snack"]] = 1.7
mult[2, idx["Salchicha"]] = 1.8; mult[2, idx["Galletas"]] = 1.2; mult[2, idx["Agua"]] = 1.2
# R4: quincena + rumor de escasez de aceite
mult[3, idx["Aceite"]] = 2.2; mult[3, idx["Arroz"]] = 1.4
mult[3, idx["PapelHig"]] = 1.5; mult[3, idx["Detergente"]] = 1.5
# R5: kermesse
mult[4, idx["Pan"]] = 1.4; mult[4, idx["Salchicha"]] = 1.6
mult[4, idx["Gaseosa2L"]] = 1.3; mult[4, idx["Snack"]] = 1.4
mult[4, idx["Galletas"]] = 1.3; mult[4, idx["Huevo"]] = 1.2; mult[4, idx["Agua"]] = 1.2

rng = np.random.default_rng(7)
noise = rng.uniform(-0.10, 0.10, (5, n))
planned = base[None, :] * mult                       # demanda planificada
actual  = np.rint(planned * (1 + noise)).astype(int)  # demanda real

# ---------- ABASTO: fill rate por ronda ----------
fill = np.ones((5, n))
fill[3, :] = 0.90               # R4: mayorista con quiebres
fill[3, idx["Aceite"]] = 0.50   # R4: aceite escaso de verdad

ABASTO = 0.90    # paga 90% del costo de referencia
FLETE  = 30.0    # Bs por viaje al Abasto
HOLD   = 0.05    # 5% del valor a costo del inventario final por ronda
FIXED  = 200.0   # costos fijos por ronda
CAP0   = 2000.0  # caja inicial

# inventario heredado: (unidades, ronda de vencimiento; 999 = no perece)
init_inv = {
    "Huevo": (60, 2), "Leche": (20, 1), "Yogurt": (8, 1), "Salchicha": (6, 1),
    "Gaseosa2L": (24, 999), "Agua": (30, 999), "Galletas": (40, 999),
    "Snack": (50, 999), "Arroz": (15, 999), "Aceite": (8, 999),
    "PapelHig": (6, 999), "Detergente": (5, 999),
}
INIT_VAL = sum(q * cost[idx[k]] for k, (q, e) in init_inv.items())

def order_qty(strategy, r, onhand):
    if strategy == "fantasma":
        return np.zeros(n)
    if strategy == "conservadora":
        return np.maximum(0, 0.60 * base - onhand)
    if strategy == "agresiva":
        return np.maximum(0, 1.50 * base - onhand)
    if strategy == "analitica":
        est = 1 + 0.9 * (mult[r] - 1)          # lee el brief, estima el evento
        return np.maximum(0, base * est * 1.10 - onhand)  # +10% stock seguridad
    raise ValueError(strategy)

def simulate(strategy, verbose=False):
    cash = CAP0
    lots = {i: [] for i in range(n)}  # (qty, unit_cost_paid, expiry_round)
    for k, (q, e) in init_inv.items():
        lots[idx[k]].append([q, cost[idx[k]], e])
    tot = dict(sales_bs=0, dem_bs=0, merma=0, hold=0, purch=0, flete=0,
               sold_u=0, dem_u=0)
    mape_cells = []
    rows = []
    for r in range(5):
        onhand = np.array([sum(l[0] for l in lots[i]) for i in range(n)])
        q = order_qty(strategy, r, onhand)
        # tope de caja
        c_order = float(np.sum(q * ABASTO * cost))
        flete = FLETE if c_order > 0 else 0.0
        if c_order + flete > cash and c_order > 0:
            scale = max(0.0, (cash - flete) / c_order)
            q = np.floor(q * scale)
            c_order = float(np.sum(q * ABASTO * cost))
        # fill rate del proveedor
        delivered = np.floor(q * fill[r])
        paid = float(np.sum(delivered * ABASTO * cost)) + (FLETE if delivered.sum() > 0 else 0)
        cash -= paid
        tot["purch"] += float(np.sum(delivered * ABASTO * cost))
        tot["flete"] += FLETE if delivered.sum() > 0 else 0
        for i in range(n):
            if delivered[i] > 0:
                exp = r + 1 + (life[i] - 1) if life[i] < 99 else 999
                lots[i].append([delivered[i], ABASTO * cost[i], exp])
        # demanda y ventas (FIFO por vencimiento)
        avail = np.array([sum(l[0] for l in lots[i]) for i in range(n)])
        d = actual[r]
        sold = np.minimum(avail, d)
        for i in range(n):
            s = sold[i]
            lots[i].sort(key=lambda l: l[2])
            for l in lots[i]:
                take = min(l[0], s); l[0] -= take; s -= take
            lots[i] = [l for l in lots[i] if l[0] > 0]
            e = min(1.0, abs(avail[i] - d[i]) / d[i]) if d[i] > 0 else 0
            mape_cells.append(e)
        rev = float(np.sum(sold * price))
        cash += rev
        tot["sales_bs"] += rev; tot["dem_bs"] += float(np.sum(d * price))
        tot["sold_u"] += int(sold.sum()); tot["dem_u"] += int(d.sum())
        # merma por vencimiento
        merma = 0.0
        for i in range(n):
            expired = [l for l in lots[i] if l[2] <= r + 1]
            merma += sum(l[0] * l[1] for l in expired)
            lots[i] = [l for l in lots[i] if l[2] > r + 1]
        tot["merma"] += merma
        # almacenaje + fijos
        inv_val = sum(l[0] * l[1] for i in range(n) for l in lots[i])
        hold = HOLD * inv_val
        cash -= hold + FIXED
        tot["hold"] += hold
        rows.append((r + 1, paid, rev, merma, hold, inv_val, cash))
        if verbose:
            print(f"  R{r+1}: compras {paid:7.0f} | ventas {rev:7.0f} | merma {merma:5.0f} | "
                  f"almac. {hold:4.0f} | inv.fin {inv_val:6.0f} | caja {cash:7.0f}")
    # liquidacion final
    liq = 0.0
    for i in range(n):
        for l in lots[i]:
            liq += l[0] * l[1] * (0.50 if life[i] >= 99 else 0.25)
    cash += liq
    profit = cash - (CAP0 + INIT_VAL)
    service = tot["sales_bs"] / tot["dem_bs"]
    mape = float(np.mean(mape_cells))
    health = max(0.0, 1 - (tot["merma"] + tot["hold"]) / tot["purch"]) if tot["purch"] > 0 else 0.0
    return dict(strategy=strategy, profit=profit, cash=cash, liq=liq, service=service,
                mape=mape, health=health, merma=tot["merma"], hold=tot["hold"],
                purch=tot["purch"], sales=tot["sales_bs"], rows=rows,
                fill_u=tot["sold_u"] / tot["dem_u"])

print(f"Valor inventario inicial a costo: {INIT_VAL:.1f} Bs | Activos iniciales: {CAP0 + INIT_VAL:.1f} Bs")
print(f"Demanda semanal base a costo: {np.sum(base*cost):.0f} Bs | a PV: {np.sum(base*price):.0f} Bs")
print()
results = []
for s in ["fantasma", "conservadora", "agresiva", "analitica"]:
    print(f"--- {s.upper()} ---")
    res = simulate(s, verbose=True)
    results.append(res)
    print(f"  Liquidacion final: {res['liq']:.0f} | UTILIDAD: {res['profit']:.0f} Bs | "
          f"servicio(Bs) {res['service']*100:.1f}% | merma {res['merma']:.0f} | MAPE {res['mape']*100:.1f}%")
    print()

# ---------- PUNTAJE ----------
profs = [r["profit"] for r in results]
pmin, pmax = min(profs), max(profs)
print(f"{'estrategia':14} {'utilidad':>9} {'servicio':>9} {'salud':>7} {'MAPE':>6} | "
      f"{'G(45)':>6} {'S(25)':>6} {'H(20)':>6} {'A(10)':>6} {'TOTAL':>6}")
for r in results:
    g = 45 * (r["profit"] - pmin) / (pmax - pmin)
    s = 25 * r["service"]
    h = 20 * r["health"]
    a = 10 * max(0, 1 - r["mape"])
    r["score"] = g + s + h + a
    print(f"{r['strategy']:14} {r['profit']:9.0f} {r['service']*100:8.1f}% {r['health']*100:6.1f}% "
          f"{r['mape']*100:5.1f}% | {g:6.1f} {s:6.1f} {h:6.1f} {a:6.1f} {r['score']:6.1f}")

# ---------- TABLAS AUXILIARES ----------
print("\n== DEMANDA PLANIFICADA (base x evento) ==")
print("Producto | " + " | ".join(f"R{r+1}" for r in range(5)))
for i in range(n):
    print(f"{names[i]:10} | " + " | ".join(f"{planned[r, i]:.0f}" for r in range(5)))

print("\n== DEMANDA REAL usada en la simulacion (con ruido +-10%) ==")
for i in range(n):
    print(f"{names[i]:10} | " + " | ".join(f"{actual[r, i]}" for r in range(5)))

# ---------- HISTORICO SEMILLA: 8 semanas ----------
hist_mult = np.ones((8, n))
hist_mult[2, idx["Agua"]] = 1.7; hist_mult[2, idx["Gaseosa2L"]] = 1.45; hist_mult[2, idx["Yogurt"]] = 1.15
hist_mult[5, idx["PapelHig"]] = 1.5; hist_mult[5, idx["Detergente"]] = 1.5; hist_mult[5, idx["Arroz"]] = 1.3
rng2 = np.random.default_rng(11)
hist = np.rint(base[None, :] * hist_mult * (1 + rng2.uniform(-0.08, 0.08, (8, n)))).astype(int)
print("\n== HISTORICO 8 SEMANAS (S3 = semana de calor, S6 = quincena) ==")
print("Producto | " + " | ".join(f"S{w+1}" for w in range(8)) + " | prom")
for i in range(n):
    print(f"{names[i]:10} | " + " | ".join(f"{hist[w, i]}" for w in range(8)) + f" | {hist[:, i].mean():.0f}")
