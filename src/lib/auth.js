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
const LOGIN_ROLE_STORAGE_KEY = 'unitutor_login_role';

export const DEFAULT_ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@utom.edu.mx';
export const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

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

function getStoredRole() {
  try {
    return localStorage.getItem(LOGIN_ROLE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredRole(role) {
  try {
    if (role) {
      localStorage.setItem(LOGIN_ROLE_STORAGE_KEY, role);
    } else {
      localStorage.removeItem(LOGIN_ROLE_STORAGE_KEY);
    }
  } catch {
    // Ignorar errores de almacenamiento
  }
}

function toSession(profile, forcedRole) {
  const resolvedRole = forcedRole || getStoredRole() || profile.role || 'student';
  return {
    matricula: profile.matricula || (resolvedRole === 'admin' ? 'ADMIN' : ''),
    name: profile.name || (resolvedRole === 'admin' ? 'Administrador' : 'Estudiante'),
    career: profile.career_id || 'it',
    email: profile.email || '',
    role: resolvedRole,
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
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    const profileData = {
      matricula: normalizedMatricula,
      name: name.trim(),
      career_id: career,
      email: email.trim(),
      role: 'student',
    };

    await setDoc(doc(db, 'profiles', user.uid), profileData);
    setStoredRole('student');

    return toSession(profileData, 'student');
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
    setStoredRole('student');
    const profile = await fetchProfile(userCredential.user.uid);
    return toSession(profile, 'student');
  } catch {
    throw new Error('Correo o contraseña incorrectas.');
  }
}

export async function loginAdmin({ email, password }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('El correo de administrador es obligatorio.');
  }

  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  } catch {
    // Si usa las credenciales de administrador por defecto y aún no existe en Firebase Auth, se inicializa automáticamente
    const isDefaultAdmin =
      normalizedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() && password === DEFAULT_ADMIN_PASSWORD;

    if (isDefaultAdmin) {
      try {
        userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      } catch {
        throw new Error('Credenciales de administrador incorrectas.');
      }
    } else {
      throw new Error('Correo o contraseña de administrador incorrectos.');
    }
  }

  const user = userCredential.user;
  const isDefaultAdmin = normalizedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase();
  let profile;
  try {
    profile = await fetchProfile(user.uid);
  } catch {
    if (!isDefaultAdmin) {
      await signOut(auth);
      throw new Error('Esta cuenta no tiene permisos de administrador.');
    }
    profile = {
      matricula: 'ADMIN-UTOM',
      name: 'Administrador General',
      career_id: 'it',
      email: normalizedEmail,
      role: 'admin',
    };
    try {
      await setDoc(doc(db, 'profiles', user.uid), profile);
    } catch {
      // Continuar con el perfil en memoria si las reglas restringen escritura
    }
  }

  if (profile.role !== 'admin' && !isDefaultAdmin) {
    await signOut(auth);
    throw new Error('Esta cuenta no tiene permisos de administrador.');
  }

  setStoredRole('admin');
  return toSession({ ...profile, role: 'admin' }, 'admin');
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
        if (getStoredRole() === 'admin') {
          resolve(
            toSession(
              {
                matricula: 'ADMIN-UTOM',
                name: 'Administrador General',
                career_id: 'it',
                email: user.email || DEFAULT_ADMIN_EMAIL,
                role: 'admin',
              },
              'admin'
            )
          );
          return;
        }
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
      if (getStoredRole() === 'admin') {
        callback(
          toSession(
            {
              matricula: 'ADMIN-UTOM',
              name: 'Administrador General',
              career_id: 'it',
              email: user.email || DEFAULT_ADMIN_EMAIL,
              role: 'admin',
            },
            'admin'
          )
        );
        return;
      }
      callback(null);
    }
  });
  return { unsubscribe };
}

export async function logout() {
  setStoredRole(null);
  await signOut(auth);
}
