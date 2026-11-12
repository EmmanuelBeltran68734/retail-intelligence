"""O2: un agotamiento solo se afirma con un conteo en cero; sin conteo es «posible»."""
from datetime import date, timedelta

from tests.conftest import registrar
from tests.test_indicadores import ENC, cab, cargar

URL = "/api/indicadores/agotamientos"


def ventas_diarias():
    """30 días seguidos de ventas. Leche y Arroz se venden todos los días; Leche deja de venderse
    los últimos 10 días y Arroz los últimos 6. Pan se vende todos los días hasta el final."""
    filas = []
    inicio = date(2026, 9, 1)
    for i in range(30):
        dia = inicio + timedelta(days=i)
        filas.append(f"{dia},P-{i},PAN,Pan,Panadería,1,3000,0,,efectivo")
        if i < 20:
            filas.append(f"{dia},L-{i},LEC,Leche,Lácteos,1,4500,0,,efectivo")
        if i < 24:
            filas.append(f"{dia},A-{i},ARZ,Arroz,Granos,1,3200,0,,efectivo")
    return ENC + "\n".join(filas) + "\n"


def subir_conteo(cliente, token, texto):
    return cliente.post("/api/inventario", headers=cab(token),
                        files={"archivo": ("conteo.csv", texto.encode(), "text/csv")})


def test_sin_conteo_es_posible_y_nunca_dice_se_agoto(cliente):
    token = registrar(cliente).json()["token"]
    cargar(cliente, token, ventas_diarias())
    r = cliente.get(URL, headers=cab(token)).json()
    tipos = {p["producto"]["codigo"]: p["tipo"] for p in r["productos"]}
    assert tipos == {"LEC": "posible", "ARZ": "posible"}  # Pan se sigue vendiendo
    for p in r["productos"]:
        assert p["confianza"] == "baja" and "agotó" not in p["mensaje"]
        assert p["mensaje"].startswith("Posible agotamiento")
    assert r["resumen"] == {"confirmado": 0, "posible": 2, "con_existencias": 0}


def test_conteo_en_cero_confirma_y_con_unidades_descarta(cliente):
    token = registrar(cliente).json()["token"]
    cargar(cliente, token, ventas_diarias())
    r = subir_conteo(cliente, token, "fecha,codigo_producto,existencias\n2026-09-28,LEC,0\n2026-09-28,ARZ,12\n")
    assert r.status_code == 200 and r.json()["conteos_guardados"] == 2
    productos = {p["producto"]["codigo"]: p for p in cliente.get(URL, headers=cab(token)).json()["productos"]}
    assert productos["LEC"]["tipo"] == "confirmado" and productos["LEC"]["confianza"] == "alta"
    assert productos["LEC"]["mensaje"].startswith("Se agotó: el conteo del 28/09/2026 dice 0 unidades.")
    assert productos["ARZ"]["tipo"] == "con_existencias" and "no fue un agotamiento" in productos["ARZ"]["mensaje"]


def test_conteo_anterior_a_la_ultima_venta_no_cuenta(cliente):
    token = registrar(cliente).json()["token"]
    cargar(cliente, token, ventas_diarias())
    subir_conteo(cliente, token, "fecha,codigo_producto,existencias\n2026-09-05,LEC,0\n")
    leche = next(p for p in cliente.get(URL, headers=cab(token)).json()["productos"] if p["producto"]["codigo"] == "LEC")
    assert leche["tipo"] == "posible" and leche["evidencia"] is None


def test_errores_por_fila_en_el_conteo(cliente):
    token = registrar(cliente).json()["token"]
    cargar(cliente, token, ventas_diarias())
    r = subir_conteo(cliente, token, "fecha,codigo_producto,existencias\n31/09/2026,LEC,1\n2026-09-28,XXX,1\n"
                                     "2026-09-28,PAN,-2\n2026-09-28,PAN,5\n").json()
    assert r["conteos_guardados"] == 1 and r["filas_con_error"] == 3
    assert [e["columna"] for e in r["errores"]] == ["fecha", "codigo_producto", "existencias"]
    assert r["errores"][1]["mensaje"] == "Fila 3: el producto «XXX» no está en tu catálogo."
    # Un segundo conteo del mismo producto y fecha reemplaza al anterior.
    r2 = subir_conteo(cliente, token, "fecha,codigo_producto,existencias\n2026-09-28,PAN,7\n").json()
    assert r2["conteos_actualizados"] == 1
    assert cliente.get("/api/inventario", headers=cab(token)).json()[0]["existencias"] == 7


def test_plantilla_y_aislamiento(cliente):
    assert cliente.get("/api/inventario/plantilla").text.lstrip("﻿").startswith("fecha,codigo_producto,existencias")
    token_a = registrar(cliente).json()["token"]
    cargar(cliente, token_a, ventas_diarias())
    subir_conteo(cliente, token_a, "fecha,codigo_producto,existencias\n2026-09-28,LEC,0\n")
    token_b = registrar(cliente, "otro@ejemplo.com", "Otra tienda").json()["token"]
    assert cliente.get(URL, headers=cab(token_b)).json() == {"sin_datos": True}
    assert cliente.get("/api/inventario", headers=cab(token_b)).json() == []
    # El otro comercio no puede contar productos que no son suyos.
    r = subir_conteo(cliente, token_b, "fecha,codigo_producto,existencias\n2026-09-28,LEC,0\n").json()
    assert r["conteos_guardados"] == 0 and r["filas_con_error"] == 1
