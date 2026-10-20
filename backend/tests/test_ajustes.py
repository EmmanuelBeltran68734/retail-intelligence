"""Ajustes de la prueba de integración con el frontend (19 oct): mensajes en español y CORS."""


def test_correo_mal_escrito_responde_en_espanol(cliente):
    r = cliente.post("/api/auth/login", json={"correo": "martaejemplo.com", "contrasena": "x"})
    assert r.status_code == 400
    mensaje = r.json()["mensaje"]
    assert mensaje.startswith("El correo no es válido")
    assert "value is not" not in mensaje and ".." not in mensaje


def test_campo_faltante_y_texto_corto(cliente):
    falta = cliente.post("/api/auth/login", json={"correo": "marta@ejemplo.com"})
    assert falta.json()["mensaje"] == "Falta el campo «contrasena»."
    corto = cliente.post("/api/auth/registro", json={
        "comercio": "T", "nombre": "Marta", "correo": "marta@ejemplo.com", "contrasena": "minimo8caracteres",
    })
    assert corto.json()["mensaje"] == "El campo «comercio» es muy corto: debe tener al menos 2 caracteres."


def test_cors_acepta_localhost_y_127(cliente):
    for origen in ("http://localhost:5173", "http://127.0.0.1:5173"):
        r = cliente.options("/api/auth/login", headers={
            "Origin": origen, "Access-Control-Request-Method": "POST",
        })
        assert r.headers.get("access-control-allow-origin") == origen
