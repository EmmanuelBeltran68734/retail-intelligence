"""Semana 3 · HU-07 (RF-05, RF-06): indicadores con filtros y aislamiento entre comercios."""
from tests.conftest import registrar

ENC = "fecha,id_ticket,codigo_producto,nombre_producto,categoria,cantidad,precio_unitario,descuento,id_cliente,medio_pago\n"
# Agosto: 100.000, cargado desde el día 1 (período completo). Septiembre: 108.000 (8 % más) en 3 tickets.
AGOSTO = ENC + ("2026-08-01,A-0,ARZ,Arroz,Granos,5,10000,0,C-1,efectivo\n"
                "2026-08-10,A-1,ARZ,Arroz,Granos,5,10000,0,C-1,efectivo\n")
SEPTIEMBRE = ENC + (
    "2026-09-01,S-1,ARZ,Arroz,Granos,5,10000,0,C-1,efectivo\n"
    "2026-09-01,S-1,LEC,Leche,Lácteos,2,4000,0,C-1,efectivo\n"
    "2026-09-08,S-2,PAN,Pan,Panadería,1,10000,0,C-2,tarjeta\n"
    "2026-09-30,S-3,ARZ,Arroz,Granos,4,10000,0,,efectivo\n"
)


def cab(token):
    return {"Authorization": f"Bearer {token}"}


def cargar(cliente, token, texto):
    id_carga = cliente.post("/api/cargas", headers=cab(token),
                            files={"archivo": ("v.csv", texto.encode(), "text/csv")}).json()["id"]
    assert cliente.post(f"/api/cargas/{id_carga}/confirmar", headers=cab(token)).status_code == 200


def tienda_con_ventas(cliente, correo="marta@ejemplo.com", comercio="Tienda Doña Marta"):
    token = registrar(cliente, correo, comercio).json()["token"]
    cargar(cliente, token, AGOSTO)
    cargar(cliente, token, SEPTIEMBRE)
    return token


def test_sin_ventas_responde_sin_datos(cliente):
    token = registrar(cliente).json()["token"]
    assert cliente.get("/api/indicadores/resumen", headers=cab(token)).json() == {"sin_datos": True}
    r = cliente.get("/api/indicadores/ventas", headers=cab(token)).json()
    assert r["sin_datos"] is True and r["puntos"] == []


def test_resumen_del_mes_como_en_la_hu07(cliente):
    """Criterio de aceptación: total, ticket promedio y variación con una frase como «Vendiste 8 % más que en agosto»."""
    token = tienda_con_ventas(cliente)
    r = cliente.get("/api/indicadores/resumen?desde=2026-09-01&hasta=2026-09-30", headers=cab(token)).json()
    assert r["periodo_anterior"] == {"desde": "2026-08-01", "hasta": "2026-08-31"}
    assert r["ventas_totales"] == {"valor": 108000, "frase": "En septiembre vendiste $108.000."}
    assert r["transacciones"] == {"valor": 3, "frase": "Hiciste 3 ventas."}
    assert r["ticket_promedio"]["valor"] == 36000
    assert r["crecimiento"] == {"valor": 8.0, "frase": "Vendiste 8 % más que en agosto.", "periodo_incompleto": False}
    assert r["concentracion"]["top_productos"] == 3 and r["concentracion"]["valor"] == 100.0


def test_periodo_por_defecto_son_los_ultimos_30_dias_con_ventas(cliente):
    token = tienda_con_ventas(cliente)
    r = cliente.get("/api/indicadores/resumen", headers=cab(token)).json()
    assert r["periodo"] == {"desde": "2026-09-01", "hasta": "2026-09-30"}


def test_filtro_por_categoria(cliente):
    token = tienda_con_ventas(cliente)
    cats = {c["nombre"]: c["id"] for c in cliente.get("/api/catalogo/categorias", headers=cab(token)).json()}
    r = cliente.get(f"/api/indicadores/resumen?desde=2026-09-01&hasta=2026-09-30&categoria_id={cats['Granos']}",
                    headers=cab(token)).json()
    assert r["ventas_totales"]["valor"] == 90000 and r["transacciones"]["valor"] == 2


def test_series_por_semana_categoria_dia_y_producto(cliente):
    token = tienda_con_ventas(cliente)
    base = "/api/indicadores/ventas?desde=2026-09-01&hasta=2026-09-30&agrupar="
    semanas = cliente.get(base + "semana", headers=cab(token)).json()["puntos"]
    assert semanas[0] == {"etiqueta": "1–7 sep", "inicio": "2026-09-01", "ventas": 58000, "transacciones": 1}
    assert len(semanas) == 5 and semanas[-1]["etiqueta"] == "29–30 sep"
    categorias = cliente.get(base + "categoria", headers=cab(token)).json()["puntos"]
    assert [p["etiqueta"] for p in categorias] == ["Granos", "Panadería", "Lácteos"]
    dias = cliente.get(base + "dia_semana", headers=cab(token)).json()["puntos"]
    assert len(dias) == 7 and dias[1]["etiqueta"] == "martes" and dias[1]["ventas"] == 58000 + 10000
    productos = cliente.get(base + "producto&limite=1", headers=cab(token)).json()["puntos"]
    assert productos == [{"etiqueta": "Arroz", "id": productos[0]["id"], "ventas": 90000, "transacciones": 2}]


def test_un_comercio_no_ve_los_datos_de_otro(cliente):
    """Plan de la semana 3: pruebas de que un comercio no ve los datos de otro."""
    token_a = tienda_con_ventas(cliente)
    token_b = registrar(cliente, "andres@ejemplo.com", "Minimercado Andrés").json()["token"]
    # B todavía no tiene ventas: no debe ver nada de A.
    assert cliente.get("/api/indicadores/resumen", headers=cab(token_b)).json() == {"sin_datos": True}
    cargar(cliente, token_b, ENC + "2026-09-15,B-1,GAS,Gaseosa,Bebidas,1,3000,0,,efectivo\n")
    rb = cliente.get("/api/indicadores/resumen?desde=2026-09-01&hasta=2026-09-30", headers=cab(token_b)).json()
    assert rb["ventas_totales"]["valor"] == 3000
    # A no cambia, y aunque use una categoría de B no ve sus ventas.
    ra = cliente.get("/api/indicadores/resumen?desde=2026-09-01&hasta=2026-09-30", headers=cab(token_a)).json()
    assert ra["ventas_totales"]["valor"] == 108000
    cat_b = cliente.get("/api/catalogo/categorias", headers=cab(token_b)).json()[0]["id"]
    ra_cat_b = cliente.get(f"/api/indicadores/ventas?desde=2026-09-01&hasta=2026-09-30&agrupar=categoria&categoria_id={cat_b}",
                           headers=cab(token_a)).json()
    assert ra_cat_b["puntos"] == []


def test_encargado_ve_el_tablero_pero_no_clientes(cliente):
    token = tienda_con_ventas(cliente)
    cliente.post("/api/usuarios", headers=cab(token),
                 json={"nombre": "Luis", "correo": "luis@ejemplo.com", "contrasena_temporal": "cambiar123"})
    enc = cliente.post("/api/auth/login", json={"correo": "luis@ejemplo.com", "contrasena": "cambiar123"}).json()["token"]
    assert cliente.get("/api/indicadores/resumen", headers=cab(enc)).status_code == 200
    assert cliente.get("/api/indicadores/ventas?agrupar=cliente", headers=cab(enc)).status_code == 403
    clientes = cliente.get("/api/indicadores/ventas?desde=2026-09-01&hasta=2026-09-30&agrupar=cliente", headers=cab(token)).json()
    assert [p["etiqueta"] for p in clientes["puntos"]] == ["C-1", "C-2"]


def test_periodo_invalido(cliente):
    token = tienda_con_ventas(cliente)
    r = cliente.get("/api/indicadores/resumen?desde=2026-09-30&hasta=2026-09-01", headers=cab(token))
    assert r.status_code == 400 and r.json()["error"] == "periodo_invalido"


def test_no_compara_contra_un_periodo_incompleto(cliente):
    """O5: si las ventas cargadas empiezan a mitad del período anterior, no se calcula el crecimiento."""
    token = registrar(cliente).json()["token"]
    cargar(cliente, token, ENC + "2026-08-20,A-1,ARZ,Arroz,Granos,1,10000,0,,efectivo\n")
    cargar(cliente, token, SEPTIEMBRE)
    c = cliente.get("/api/indicadores/resumen?desde=2026-09-01&hasta=2026-09-30", headers=cab(token)).json()["crecimiento"]
    assert c["valor"] is None and c["periodo_incompleto"] is True
    assert c["frase"] == ("No comparamos con agosto porque tus ventas cargadas empiezan el 20 de agosto: "
                          "ese período está incompleto.")


def test_no_compara_si_el_periodo_actual_va_a_medias(cliente):
    token = tienda_con_ventas(cliente)
    c = cliente.get("/api/indicadores/resumen?desde=2026-09-01&hasta=2026-10-31", headers=cab(token)).json()["crecimiento"]
    assert c["valor"] is None and c["periodo_incompleto"] is True
