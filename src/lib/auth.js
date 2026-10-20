// Autenticación con Firebase Auth (email+password) y perfiles en Cloud Firestore.
// Formato real de matrícula: UTOM + 4 dígitos + código de carrera (4 letras)
// Ej: UTOM2024TIID  →  UTOM / 2024 / TIID (Tecnologías de la Información)
// Todo en mayúsculas. Ajusta INSTITUTION_CODE y CAREER_CODES si cambia el prefijo o los códigos de carrera.

import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const INSTITUTION_CODE = 'UTOM';

// Código de 4 letras embebido en la matrícula para cada carrera.
export const CAREER_CODES = {
  it: 'TIID',
  bio: 'BIIO',
  gastro: 'GTRO',
  mkt: 'MERC',
};

const MATRICULA_REGEX = new RegExp(
  `^${INSTITUTION_CODE}(\\d{4})(${Object.values(CAREER_CODES).join('|')})$`
);

function parseMatricula(matricula) {
  const value = (matricula || '').trim().toUpperCase();
  const match = MATRICULA_REGEX.exec(value);
  if (!match) return null;
  const [, digits, careerCode] = match;
  return { value, digits, careerCode };
}

export function validateMatricula(matricula, careerId) {
  const value = (matricula || '').trim();

  if (!value) {
    return 'La matrícula es obligatoria.';
  }

  const parsed = parseMatricula(value);
  if (!parsed) {
    return `La matrícula debe tener el formato ${INSTITUTION_CODE} + 4 dígitos + carrera (TIID, BIIO, GTRO o MERC), ej. ${INSTITUTION_CODE}2024TIID.`;
  }

  if (careerId) {
    const expectedCode = CAREER_CODES[careerId];
    if (expectedCode && parsed.careerCode !== expectedCode) {
      return `El código de carrera de la matrícula (${parsed.careerCode}) no corresponde a la carrera seleccionada.`;
    }
  }

  return null;
}

export function validatePassword(password) {
  if (!password || password.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  return null;
}

function toSession(profile) {
  return {
    matricula: profile.matricula,
    name: profile.name,
    career: profile.career_id,
  };
}

async function fetchProfile(userId) {
  const docRef = doc(db, 'profiles', userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('No se pudo cargar el perfil del usuario.');
  }
  return docSnap.data();
}

export async function registerUser({ name, matricula, career, email, password }) {
  if (!name || !name.trim()) {
    throw new Error('El nombre completo es obligatorio.');
  }
  if (!career) {
    throw new Error('Selecciona tu carrera.');
  }
  if (!email || !email.trim()) {
    throw new Error('El correo es obligatorio.');
  }

  const matriculaError = validateMatricula(matricula, career);
  if (matriculaError) throw new Error(matriculaError);

  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  const normalizedMatricula = matricula.trim().toUpperCase();

  try {
    // 1. Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    const profileData = {
      matricula: normalizedMatricula,
      name: name.trim(),
      career_id: career,
      email: email.trim(),
    };

    // 2. Guardar el perfil adicional seguro en Cloud Firestore usando el UID del usuario
    await setDoc(doc(db, 'profiles', user.uid), profileData);

    return toSession(profileData);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Ya existe una cuenta registrada con ese correo.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('El formato del correo electrónico no es válido.');
    }
    throw new Error(error.message);
  }
}

export async function loginUser({ email, password }) {
  if (!email || !email.trim()) {
    throw new Error('El correo electrónico es obligatorio.');
  }

  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = await fetchProfile(userCredential.user.uid);
    return toSession(profile);
  } catch {
    throw new Error('Correo o contraseña incorrectas.');
  }
}

export async function getSession() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (!user) {
        resolve(null);
        return;
      }
      try {
        const profile = await fetchProfile(user.uid);
        resolve(toSession(profile));
      } catch {
        resolve(null);
      }
    });
  });
}

export function onAuthStateChange(callback) {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    try {
      const profile = await fetchProfile(user.uid);
      callback(toSession(profile));
    } catch {
      callback(null);
    }
  });
  return { unsubscribe };
}

export async function logout() {
  await signOut(auth);
}
