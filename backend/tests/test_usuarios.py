"""HU-02: el propietario maneja su equipo y el encargado no puede administrar usuarios."""
from tests.conftest import registrar


def cabecera(token):
    return {"Authorization": f"Bearer {token}"}


def crear_encargado(cliente, token, correo="luis@ejemplo.com"):
    return cliente.post("/api/usuarios", headers=cabecera(token), json={
        "nombre": "Luis Gómez", "correo": correo, "contrasena_temporal": "cambiar123",
    })


def login(cliente, correo, contrasena):
    return cliente.post("/api/auth/login", json={"correo": correo, "contrasena": contrasena})


def test_propietario_agrega_encargado_y_lo_ve_en_la_lista(cliente):
    token = registrar(cliente).json()["token"]
    r = crear_encargado(cliente, token)
    assert r.status_code == 201 and r.json()["rol"] == "encargado"
    lista = cliente.get("/api/usuarios", headers=cabecera(token)).json()
    assert [m["rol"] for m in lista] == ["propietario", "encargado"]


def test_encargado_puede_entrar_pero_no_administrar_usuarios(cliente):
    """Criterio de aceptación de la HU-02 (la parte de usuarios; cargas y clientes llegan en sus historias)."""
    token = registrar(cliente).json()["token"]
    crear_encargado(cliente, token)
    sesion = login(cliente, "luis@ejemplo.com", "cambiar123")
    assert sesion.status_code == 200 and sesion.json()["usuario"]["rol"] == "encargado"
    token_enc = sesion.json()["token"]
    for r in (
        cliente.get("/api/usuarios", headers=cabecera(token_enc)),
        crear_encargado(cliente, token_enc, "otro@ejemplo.com"),
    ):
        assert r.status_code == 403 and r.json()["error"] == "sin_permiso"


def test_encargado_desactivado_no_puede_entrar(cliente):
    token = registrar(cliente).json()["token"]
    id_luis = crear_encargado(cliente, token).json()["id"]
    r = cliente.patch(f"/api/usuarios/{id_luis}", headers=cabecera(token), json={"activo": False})
    assert r.status_code == 200 and r.json()["activo"] is False
    assert login(cliente, "luis@ejemplo.com", "cambiar123").status_code == 403


def test_propietario_no_se_desactiva_a_si_mismo(cliente):
    datos = registrar(cliente).json()
    r = cliente.patch(f"/api/usuarios/{datos['usuario']['id']}", headers=cabecera(datos["token"]), json={"activo": False})
    assert r.status_code == 400 and r.json()["error"] == "no_permitido"


def test_no_se_ve_ni_se_toca_el_equipo_de_otro_comercio(cliente):
    token_a = registrar(cliente, "marta@ejemplo.com", "Tienda Doña Marta").json()["token"]
    token_b = registrar(cliente, "andres@ejemplo.com", "Minimercado Andrés").json()["token"]
    id_luis = crear_encargado(cliente, token_a).json()["id"]
    lista_b = cliente.get("/api/usuarios", headers=cabecera(token_b)).json()
    assert all(m["correo"] != "luis@ejemplo.com" for m in lista_b)
    r = cliente.patch(f"/api/usuarios/{id_luis}", headers=cabecera(token_b), json={"activo": False})
    assert r.status_code == 404


def test_correo_repetido_y_contrasena_corta(cliente):
    token = registrar(cliente).json()["token"]
    assert crear_encargado(cliente, token, "marta@ejemplo.com").status_code == 409
    r = cliente.post("/api/usuarios", headers=cabecera(token), json={
        "nombre": "Ana", "correo": "ana@ejemplo.com", "contrasena_temporal": "123",
    })
    assert r.status_code == 400 and r.json()["error"] == "contrasena_corta"
