"""Ruta GET /indicadores/pronostico: usa el Holt-Winters de Bianca y agrega rango y errores."""
from datetime import date, timedelta

from tests.conftest import registrar
from tests.test_indicadores import ENC, cab, cargar

URL = "/api/indicadores/pronostico"


def ventas_semanales(semanas=16, inicio=date(2026, 5, 5)):
    """Una venta de Granos y otra de Lácteos cada semana, con tendencia y un ciclo de 4 semanas."""
    filas = []
    for i in range(semanas):
        dia = inicio + timedelta(weeks=i)  # martes: cada venta cae en una semana distinta
        precio = 100000 + 2000 * i + [0, 15000, -10000, 5000][i % 4]
        filas.append(f"{dia},T-{i}a,ARZ,Arroz,Granos,1,{precio},0,,efectivo")
        filas.append(f"{dia},T-{i}b,LEC,Leche,Lácteos,1,{precio // 2},0,,efectivo")
    return ENC + "\n".join(filas) + "\n"


def test_sin_ventas_responde_sin_datos(cliente):
    token = registrar(cliente).json()["token"]
    assert cliente.get(URL, headers=cab(token)).json() == {"sin_datos": True}


def test_pronostico_con_rango_y_errores(cliente):
    token = registrar(cliente).json()["token"]
    cargar(cliente, token, ventas_semanales())
    r = cliente.get(URL, headers=cab(token))
    assert r.status_code == 200
    datos = r.json()
    assert datos["sin_datos"] is False and datos["semanas"] == 4 and datos["omitidas"] == []
    assert [s["categoria"] for s in datos["series"]] == ["Total del comercio", "Granos", "Lácteos"]
    total = datos["series"][0]
    assert total["id_categoria"] is None
    assert len(total["pronostico"]) == 4
    for punto in total["pronostico"]:
        assert 0 <= punto["bajo"] <= punto["valor"] <= punto["alto"]
    # Las semanas pronosticadas son posteriores a la última semana completa de historia.
    assert total["pronostico"][0]["semana_fin"] > datos["historia"]["hasta"]
    error = total["error"]
    assert error["semanas_evaluadas"] == 4 and error["mae_modelo"] >= 0 and error["mae_base"] >= 0
    assert total["mejor"] in ("modelo", "base") and total["frase"].startswith("En las últimas 4 semanas")


def test_filtro_por_categoria_y_numero_de_semanas(cliente):
    token = registrar(cliente).json()["token"]
    cargar(cliente, token, ventas_semanales())
    id_granos = next(c["id"] for c in cliente.get("/api/catalogo/categorias", headers=cab(token)).json()
                     if c["nombre"] == "Granos")
    datos = cliente.get(f"{URL}?categoria_id={id_granos}&semanas=2", headers=cab(token)).json()
    assert [s["categoria"] for s in datos["series"]] == ["Granos"]
    assert len(datos["series"][0]["pronostico"]) == 2


def test_poca_historia_explica_lo_que_falta(cliente):
    token = registrar(cliente).json()["token"]
    cargar(cliente, token, ventas_semanales(semanas=6))
    datos = cliente.get(URL, headers=cab(token)).json()
    assert datos["series"] == [] and len(datos["omitidas"]) == 3
    assert "al menos 12 semanas" in datos["mensaje"]


def test_semanas_fuera_de_rango(cliente):
    token = registrar(cliente).json()["token"]
    assert cliente.get(f"{URL}?semanas=20", headers=cab(token)).status_code == 400


def test_un_comercio_no_ve_el_pronostico_de_otro(cliente):
    token_a = registrar(cliente).json()["token"]
    cargar(cliente, token_a, ventas_semanales())
    token_b = registrar(cliente, "otro@ejemplo.com", "Otra tienda").json()["token"]
    assert cliente.get(URL, headers=cab(token_b)).json() == {"sin_datos": True}


def test_semana_a_medias_no_entra_al_pronostico():
    """Una venta suelta en una semana incompleta no cambia el resultado (solo semanas completas)."""
    from datetime import date
    import pandas as pd
    from app.servicios import pronostico_tablero

    filas = [{"fecha": date(2026, 5, 4) + timedelta(weeks=i), "id_categoria": 1, "categoria": "Granos",
              "importe": 100000.0 + 2000 * i + [0, 15000, -10000, 5000][i % 4]} for i in range(16)]
    base = pd.DataFrame(filas)
    a_medias = pd.concat([base, pd.DataFrame([{"fecha": date(2026, 8, 25), "id_categoria": 1,
                                               "categoria": "Granos", "importe": 5.0}])])
    assert pronostico_tablero.calcular(base, 4, True) == pronostico_tablero.calcular(a_medias, 4, True)


def test_misma_data_misma_ejecucion_y_semana_nueva_otra(cliente):
    """O3: dos llamadas seguidas dan el mismo número de ejecución; al cargar una semana nueva, cambia."""
    token = registrar(cliente).json()["token"]
    cargar(cliente, token, ventas_semanales())
    primera = cliente.get(URL, headers=cab(token)).json()
    segunda = cliente.get(URL, headers=cab(token)).json()
    e1, e2 = primera["ejecucion"], segunda["ejecucion"]
    assert e1["numero"] == e2["numero"] and e1["reutilizada"] is False and e2["reutilizada"] is True
    assert e1["version_modelo"] == "holt_winters_semanal 1.0" and e1["parametros"]["periodos_estacionales"] == 4
    assert len(e1["huella_datos"]) == 64 and e1["cargas_de_origen"] == 1
    assert segunda["series"] == primera["series"]

    # Una semana completa más (martes y el lunes siguiente cierra la semana).
    nueva = ENC + "2026-08-25,N-1,ARZ,Arroz,Granos,1,130000,0,,efectivo\n2026-08-31,N-2,ARZ,Arroz,Granos,1,1000,0,,efectivo\n"
    cargar(cliente, token, nueva)
    tercera = cliente.get(URL, headers=cab(token)).json()
    assert tercera["ejecucion"]["numero"] != e1["numero"] and tercera["ejecucion"]["cargas_de_origen"] == 2


def test_otra_consulta_es_otra_ejecucion(cliente):
    token = registrar(cliente).json()["token"]
    cargar(cliente, token, ventas_semanales())
    cuatro = cliente.get(URL, headers=cab(token)).json()["ejecucion"]["numero"]
    dos = cliente.get(f"{URL}?semanas=2", headers=cab(token)).json()["ejecucion"]["numero"]
    assert cuatro != dos
