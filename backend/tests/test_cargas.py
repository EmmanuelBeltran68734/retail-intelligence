"""Semana 2 · HU-03 a HU-06: plantilla, carga con errores explicados, confirmación y catálogo."""
import io

import pandas as pd

from tests.conftest import registrar

ENCABEZADO = "fecha,id_ticket,codigo_producto,nombre_producto,categoria,cantidad,precio_unitario,descuento,id_cliente,medio_pago\n"
BUENO = ENCABEZADO + (
    "2026-09-14,F-1,ARZ-500,Arroz Diana 500 g,Granos,2,3200,0,C-014,efectivo\n"
    "2026-09-14,F-1,LEC-1L,Leche entera 1 L,Lácteos,1,4500,0,C-014,efectivo\n"
    "2026-09-15,F-2,ARZ-500,Arroz Diana 500 g,Granos,1,3200,200,,transferencia\n"
)


def cabecera(token):
    return {"Authorization": f"Bearer {token}"}


def subir(cliente, token, texto, nombre="ventas.csv"):
    return cliente.post("/api/cargas", headers=cabecera(token),
                        files={"archivo": (nombre, texto.encode("utf-8"), "text/csv")})


# HU-03 -----------------------------------------------------------------------

def test_plantilla_csv_y_excel_con_tres_ejemplos(cliente):
    csv = cliente.get("/api/cargas/plantilla")
    assert csv.status_code == 200 and "plantilla_ventas.csv" in csv.headers["content-disposition"]
    df = pd.read_csv(io.BytesIO(csv.content), encoding="utf-8-sig")
    assert list(df.columns)[:3] == ["fecha", "id_ticket", "codigo_producto"] and len(df) == 3
    xlsx = cliente.get("/api/cargas/plantilla?formato=xlsx")
    assert len(pd.read_excel(io.BytesIO(xlsx.content))) == 3


# HU-04 -----------------------------------------------------------------------

def test_archivo_bueno_queda_recibido_y_dice_que_columnas_ignoro(cliente):
    token = registrar(cliente).json()["token"]
    texto = BUENO.replace("medio_pago\n", "medio_pago,vendedor\n").replace("efectivo\n", "efectivo,Luis\n")
    r = subir(cliente, token, texto)
    assert r.status_code == 201
    datos = r.json()
    assert datos["estado"] == "recibida" and datos["filas_validas"] == 3 and datos["errores"] == []
    assert datos["columnas_ignoradas"] == ["vendedor"]
    assert datos["periodo"] == {"desde": "2026-09-14", "hasta": "2026-09-15"}


def test_csv_con_punto_y_coma_y_encabezados_con_tildes(cliente):
    token = registrar(cliente).json()["token"]
    texto = ("Fecha;ID ticket;Código producto;Nombre producto;Categoría;Cantidad;Precio unitario\n"
             "14/09/2026;F-9;PAN;Pan tajado;Panadería;1;6.800\n")
    r = subir(cliente, token, texto)
    assert r.status_code == 201 and r.json()["filas_validas"] == 1


def test_faltan_columnas_obligatorias(cliente):
    token = registrar(cliente).json()["token"]
    r = subir(cliente, token, "fecha,producto\n2026-09-14,Arroz\n")
    assert r.status_code == 422 and r.json()["error"] == "columnas_faltantes"
    assert "cantidad" in r.json()["faltan"]


def test_formato_no_soportado(cliente):
    token = registrar(cliente).json()["token"]
    assert subir(cliente, token, BUENO, "ventas.pdf").json()["error"] == "formato_no_soportado"


# HU-05 -----------------------------------------------------------------------

def test_errores_explicados_como_en_la_hu05(cliente):
    """Criterio de aceptación: «Fila 15: la fecha 31/02/2026 no existe. Escríbala como AAAA-MM-DD»."""
    token = registrar(cliente).json()["token"]
    filas = [f"2026-09-{d:02d},F-{d},ARZ-500,Arroz,Granos,1,3200,,," for d in range(1, 14)]  # filas 2 a 14
    filas.append("31/02/2026,F-99,ARZ-500,Arroz,Granos,1,3200,,,")                              # fila 15
    filas.append("2026-09-20,F-100,LEC-1L,Leche,Lácteos,-2,4500,,,")                              # fila 16
    r = subir(cliente, token, ENCABEZADO + "\n".join(filas) + "\n")
    datos = r.json()
    assert datos["estado"] == "con_errores" and datos["filas_validas"] == 13 and datos["filas_con_error"] == 2
    fecha = datos["errores"][0]
    assert fecha["fila"] == 15 and fecha["columna"] == "fecha"
    assert f"{fecha['mensaje']} {fecha['sugerencia']}" == "Fila 15: la fecha 31/02/2026 no existe. Escríbala como AAAA-MM-DD."
    assert datos["errores"][1]["mensaje"] == "Fila 16: «cantidad» debe ser mayor que cero."
    # El detalle devuelve lo mismo sin volver a subir el archivo.
    assert cliente.get(f"/api/cargas/{datos['id']}", headers=cabecera(token)).json()["errores"] == datos["errores"]


# HU-06 -----------------------------------------------------------------------

def test_confirmar_guarda_ventas_y_crea_catalogo(cliente):
    """Criterio de aceptación: un producto que no existe se crea con su nombre y categoría y aparece en el resumen."""
    token = registrar(cliente).json()["token"]
    id_carga = subir(cliente, token, BUENO).json()["id"]
    r = cliente.post(f"/api/cargas/{id_carga}/confirmar", headers=cabecera(token))
    assert r.status_code == 200
    datos = r.json()
    assert datos["estado"] == "validada" and datos["ventas_guardadas"] == 3 and datos["filas_descartadas"] == 0
    assert datos["total_vendido"] == 2 * 3200 + 4500 + 3200 - 200
    assert {p["codigo"] for p in datos["catalogo_nuevo"]["productos"]} == {"ARZ-500", "LEC-1L"}
    assert datos["catalogo_nuevo"]["categorias"] == ["Granos", "Lácteos"]
    assert datos["catalogo_nuevo"]["clientes"] == 1

    productos = cliente.get("/api/catalogo/productos?buscar=arroz", headers=cabecera(token)).json()
    assert productos[0]["categoria"]["nombre"] == "Granos"
    categorias = cliente.get("/api/catalogo/categorias", headers=cabecera(token)).json()
    assert {c["nombre"]: c["productos"] for c in categorias} == {"Granos": 1, "Lácteos": 1}
    assert cliente.post(f"/api/cargas/{id_carga}/confirmar", headers=cabecera(token)).status_code == 409


def test_un_ticket_repetido_no_se_duplica(cliente):
    token = registrar(cliente).json()["token"]
    primera = subir(cliente, token, BUENO).json()["id"]
    cliente.post(f"/api/cargas/{primera}/confirmar", headers=cabecera(token))
    segunda = subir(cliente, token, BUENO).json()["id"]
    r = cliente.post(f"/api/cargas/{segunda}/confirmar", headers=cabecera(token)).json()
    assert r["ventas_guardadas"] == 0 and r["filas_descartadas"] == 3
    assert r["catalogo_nuevo"]["productos"] == []


def test_descartar_y_aislamiento_entre_comercios(cliente):
    token_a = registrar(cliente, "marta@ejemplo.com", "Tienda Doña Marta").json()["token"]
    token_b = registrar(cliente, "andres@ejemplo.com", "Minimercado Andrés").json()["token"]
    id_carga = subir(cliente, token_a, BUENO).json()["id"]
    assert cliente.get(f"/api/cargas/{id_carga}", headers=cabecera(token_b)).status_code == 404
    assert cliente.get("/api/cargas", headers=cabecera(token_b)).json() == []
    assert cliente.delete(f"/api/cargas/{id_carga}", headers=cabecera(token_a)).status_code == 204
    assert cliente.get(f"/api/cargas/{id_carga}", headers=cabecera(token_a)).json()["estado"] == "rechazada"


def test_encargado_carga_pero_no_ve_clientes(cliente):
    """Criterio de aceptación de la HU-02: el encargado puede cargar archivos, pero no ve clientes."""
    token = registrar(cliente).json()["token"]
    cliente.post("/api/usuarios", headers=cabecera(token),
                 json={"nombre": "Luis", "correo": "luis@ejemplo.com", "contrasena_temporal": "cambiar123"})
    token_enc = cliente.post("/api/auth/login", json={"correo": "luis@ejemplo.com", "contrasena": "cambiar123"}).json()["token"]
    assert subir(cliente, token_enc, BUENO).status_code == 201
    assert cliente.get("/api/catalogo/clientes", headers=cabecera(token_enc)).status_code == 403
    assert cliente.get("/api/catalogo/clientes", headers=cabecera(token)).status_code == 200
