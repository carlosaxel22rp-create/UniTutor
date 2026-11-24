from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import auth, credentials, firestore
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
cred_path = BASE_DIR / "serviceAccountKey.json"

if not firebase_admin._apps:
    cred = credentials.Certificate(str(cred_path))
    firebase_admin.initialize_app(cred)

db = firestore.client()

app = FastAPI(title="UniTutor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verificar_token(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Formato de token inválido")
    token = authorization.split("Bearer ")[1]
    try:
        return auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


class GestionSolicitudSchema(BaseModel):
    solicitud_id: str
    estado: str  # "aprobado" | "rechazado" | "pendiente"


class CrearBookingSchema(BaseModel):
    tutor_id: str
    subject_id: str
    subject_name: str = ""
    fecha_hora: str
    modalidad: str = "Virtual"


class GestionarBookingSchema(BaseModel):
    booking_id: str
    estado: str  # "confirmada" | "rechazada"


@app.get("/api/health")
def health_check():
    return {"status": "ok", "project": "unitutor-3a6af"}


@app.post("/api/admin/solicitudes")
def gestionar_solicitud(
    payload: GestionSolicitudSchema,
    user: dict = Depends(verificar_token),
):
    if payload.estado not in ("aprobado", "rechazado", "pendiente"):
        raise HTTPException(status_code=400, detail="Estado no válido")

    admin_snap = db.collection("profiles").document(user["uid"]).get()
    es_admin_correo = user.get("email") == "admin@utom.edu.mx"
    es_admin_rol = admin_snap.exists and admin_snap.to_dict().get("role") == "admin"

    if not (es_admin_correo or es_admin_rol):
        raise HTTPException(status_code=403, detail="Acceso denegado: solo administradores")

    sol_ref = db.collection("solicitudes_tutor").document(payload.solicitud_id)
    sol_snap = sol_ref.get()
    if not sol_snap.exists:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    sol_data = sol_snap.to_dict()
    estudiante_id = sol_data["estudiante_id"]

    profile_ref = db.collection("profiles").document(estudiante_id)
    profile_snap = profile_ref.get()
    profile_data = profile_snap.to_dict() if profile_snap.exists else {}

    nombre_tutor = profile_data.get("name") or sol_data.get("estudiante_nombre") or "Estudiante Tutor"
    materia = sol_data.get("materia_principal", "")
    calificacion = float(sol_data.get("calificacion_materia") or 9.5)
    descripcion = sol_data.get("descripcion") or "Tutor académico par en UTOM."

    dias_disp = sol_data.get("dias_disponibles") or ["Lunes", "Miércoles", "Viernes"]
    horas_disp = sol_data.get("horarios_disponibles") or [
        sol_data.get("disponibilidad_horaria") or "04:00 PM"
    ]

    avatar_url = profile_data.get("photoURL") or (
        f"https://ui-avatars.com/api/?name={quote(nombre_tutor)}&background=0D8ABC&color=fff"
    )

    otras_aprobadas = (
        db.collection("solicitudes_tutor")
        .where("estudiante_id", "==", estudiante_id)
        .where("estado", "==", "aprobado")
        .get()
    )
    tiene_otras_materias_aprobadas = any(
        doc.id != payload.solicitud_id for doc in otras_aprobadas
    )

    @firestore.transactional
    def ejecutar_cambio(transaction):
        transaction.update(sol_ref, {
            "estado": payload.estado,
            "revisado_en": datetime.now(timezone.utc).isoformat(),
        })

        tutor_ref = db.collection("tutors").document(estudiante_id)

        if payload.estado == "aprobado":
            if profile_snap.exists:
                transaction.update(profile_ref, {"role": "tutor"})

            transaction.set(
                tutor_ref,
                {
                    "uid": estudiante_id,
                    "name": nombre_tutor,
                    "age": profile_data.get("age", 20),
                    "rating": calificacion,
                    "reviews": 1,
                    "image": avatar_url,
                    "description": descripcion,
                    "subjects": firestore.ArrayUnion([materia]) if materia else [],
                    "days": firestore.ArrayUnion(dias_disp),
                    "hours": firestore.ArrayUnion(horas_disp),
                    "modalidad": "Virtual",
                    "matricula": profile_data.get("matricula") or sol_data.get("estudiante_matricula", ""),
                    "activo": True,
                },
                merge=True,
            )
        else:
            if profile_snap.exists and profile_data.get("role") == "tutor" and not tiene_otras_materias_aprobadas:
                transaction.update(profile_ref, {"role": "student"})

    ejecutar_cambio(db.transaction())
    return {
        "ok": True,
        "estudiante_id": estudiante_id,
        "estado": payload.estado,
    }


@app.post("/api/bookings")
def crear_booking(
    payload: CrearBookingSchema,
    user: dict = Depends(verificar_token),
):
    estudiante_id = user["uid"]

    if payload.modalidad.strip().lower() != "virtual":
        raise HTTPException(
            status_code=400,
            detail="Solo se permiten asesorías en modalidad Virtual.",
        )

    tutor_doc = db.collection("tutors").document(payload.tutor_id).get()
    if tutor_doc.exists:
        tutor_uid = tutor_doc.to_dict().get("uid") or payload.tutor_id
    else:
        tutor_uid = payload.tutor_id

    if estudiante_id == tutor_uid:
        raise HTTPException(
            status_code=400,
            detail="No puedes agendar una asesoría contigo mismo",
        )

    choques = (
        db.collection("bookings")
        .where("tutor_id", "==", tutor_uid)
        .where("fecha_hora", "==", payload.fecha_hora)
        .where("estado", "in", ["pendiente", "confirmada"])
        .get()
    )
    if len(choques) > 0:
        raise HTTPException(status_code=409, detail="Ese horario ya está ocupado")

    # Obtener datos del estudiante que agenda para mostrarlos al tutor
    est_snap = db.collection("profiles").document(estudiante_id).get()
    est_data = est_snap.to_dict() if est_snap.exists else {}
    estudiante_nombre = est_data.get("name") or user.get("email") or "Estudiante UTOM"
    estudiante_matricula = est_data.get("matricula", "")
    materia_nombre = payload.subject_name.strip() or payload.subject_id

    _, ref = db.collection("bookings").add({
        "estudiante_id": estudiante_id,
        "estudiante_nombre": estudiante_nombre,
        "estudiante_matricula": estudiante_matricula,
        "tutor_id": tutor_uid,
        "subject_id": payload.subject_id,
        "subject_name": materia_nombre,
        "fecha_hora": payload.fecha_hora,
        "modalidad": "Virtual",
        "estado": "pendiente",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "booking_id": ref.id}


@app.post("/api/bookings/gestionar")
def gestionar_booking(
    payload: GestionarBookingSchema,
    user: dict = Depends(verificar_token),
):
    if payload.estado not in ("confirmada", "rechazada"):
        raise HTTPException(status_code=400, detail="Estado no válido. Usa 'confirmada' o 'rechazada'.")

    booking_ref = db.collection("bookings").document(payload.booking_id)
    booking_snap = booking_ref.get()
    if not booking_snap.exists:
        raise HTTPException(status_code=404, detail="La solicitud de asesoría no existe.")

    booking_data = booking_snap.to_dict()
    if booking_data.get("tutor_id") != user["uid"]:
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para responder esta asesoría.",
        )

    booking_ref.update({
        "estado": payload.estado,
        "respondido_en": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "ok": True,
        "booking_id": payload.booking_id,
        "estado": payload.estado,
    }
