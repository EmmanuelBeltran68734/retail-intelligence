"""Semana 4 · HU-08 (RF-07): clasificación ABC de productos."""
from tests.conftest import registrar
from tests.test_indicadores import ENC, cab, cargar

# Total 100.000: 50 %, 25 %, 10 %, 8 %, 4 % y 3 %.
VENTAS = ENC + (
    "2026-09-02,T-1,P1,Arroz,Granos,1,50000,0,,efectivo\n"
    "2026-09-03,T-2,P2,Leche,Lácteos,1,25000,0,,efectivo\n"
    "2026-09-04,T-3,P3,Pan,Panadería,1,10000,0,,efectivo\n"
    "2026-09-05,T-4,P4,Huevos,Granos,1,8000,0,,efectivo\n"
    "2026-09-06,T-5,P5,Sal,Granos,1,4000,0,,efectivo\n"
    "2026-09-07,T-6,P6,Fósforos,Hogar,1,3000,0,,efectivo\n"
)
URL = "/api/indicadores/abc?desde=2026-09-01&hasta=2026-09-30"


def test_sin_ventas(cliente):
    token = registrar(cliente).json()["token"]
    assert cliente.get("/api/indicadores/abc", headers=cab(token)).json() == {"sin_datos": True}


def test_grupos_y_porcentaje_acumulado_como_en_la_hu08(cliente):
    """Criterio de aceptación: dado un período, se ven los grupos A, B y C y el porcentaje acumulado de ventas."""
    token = registrar(cliente).json()["token"]
    cargar(cliente, token, VENTAS)
    r = cliente.get(URL, headers=cab(token)).json()
    assert r["sin_datos"] is False and r["cortes"] == {"A": 80, "B": 95}
    assert [(p["codigo"], p["grupo"]) for p in r["productos"]] == [
        ("P1", "A"), ("P2", "A"), ("P3", "A"), ("P4", "B"), ("P5", "B"), ("P6", "C")]
    assert [p["porcentaje_acumulado"] for p in r["productos"]] == [50, 75, 85, 93, 97, 100]
    assert r["productos"][0] == {"id": r["productos"][0]["id"], "codigo": "P1", "nombre": "Arroz", "categoria": "Granos",
                                 "ventas": 50000, "porcentaje": 50, "porcentaje_acumulado": 50, "grupo": "A"}
    resumen = {g["grupo"]: (g["productos"], g["porcentaje_ventas"]) for g in r["resumen"]}
    assert resumen == {"A": (3, 85.0), "B": (2, 12.0), "C": (1, 3.0)}
    assert r["resumen"][0]["consejo"].startswith("Nunca dejes que se agoten")


def test_un_solo_producto_es_a(cliente):
    token = registrar(cliente).json()["token"]
    cargar(cliente, token, ENC + "2026-09-02,T-1,P1,Arroz,Granos,1,5000,0,,efectivo\n")
    r = cliente.get(URL, headers=cab(token)).json()
    assert [p["grupo"] for p in r["productos"]] == ["A"]


def test_filtro_por_categoria_y_aislamiento(cliente):
    token_a = registrar(cliente, "marta@ejemplo.com", "Tienda Doña Marta").json()["token"]
    cargar(cliente, token_a, VENTAS)
    granos = {c["nombre"]: c["id"] for c in cliente.get("/api/catalogo/categorias", headers=cab(token_a)).json()}["Granos"]
    r = cliente.get(f"{URL}&categoria_id={granos}", headers=cab(token_a)).json()
    assert [p["codigo"] for p in r["productos"]] == ["P1", "P4", "P5"]
    token_b = registrar(cliente, "andres@ejemplo.com", "Minimercado Andrés").json()["token"]
    assert cliente.get(URL, headers=cab(token_b)).json() == {"sin_datos": True}
