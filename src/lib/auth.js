// Autenticación con Supabase Auth (email+password).
// La matrícula sigue siendo la identidad "visible" para el usuario: el login
// pide matrícula+contraseña, y por debajo resolvemos el email registrado
// (vía RPC get_email_by_matricula) para autenticar con Supabase.
//
// Formato real de matrícula: UTOM + 4 dígitos (aleatorios, fijos en longitud) + código de carrera (4 letras)
// Ej: UTOM2024TIID  →  UTOM / 2024 / TIID (Tecnologías de la Información)
// Todo en mayúsculas. Ajusta INSTITUTION_CODE y CAREER_CODES si cambia el prefijo o los códigos de carrera.

import { supabase } from './supabaseClient';

const INSTITUTION_CODE = 'UTOM';

// Código de 4 letras embebido en la matrícula para cada carrera (debe coincidir con supabase/schema.sql).
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

// careerId es opcional: cuando se pasa, además verifica que el código de
// carrera embebido en la matrícula corresponda a la carrera seleccionada.
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
  const { data, error } = await supabase
    .from('profiles')
    .select('matricula, name, career_id')
    .eq('id', userId)
    .single();

  if (error) throw new Error('No se pudo cargar el perfil del usuario.');
  return data;
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

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { matricula: normalizedMatricula, name: name.trim(), career },
    },
  });

  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      throw new Error('Ya existe una cuenta registrada con ese correo.');
    }
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('No se pudo crear la cuenta.');
  }

  if (!data.session) {
    // El proyecto de Supabase tiene activada la confirmación por correo.
    throw new Error('Cuenta creada. Revisa tu correo para confirmar tu cuenta y luego inicia sesión.');
  }

  return { matricula: normalizedMatricula, name: name.trim(), career };
}

export async function loginUser({ matricula, password }) {
  const matriculaError = validateMatricula(matricula);
  if (matriculaError) throw new Error(matriculaError);

  const { data: email, error: lookupError } = await supabase.rpc('get_email_by_matricula', {
    p_matricula: matricula.trim(),
  });

  if (lookupError || !email) {
    throw new Error('Matrícula o contraseña incorrectas.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error('Matrícula o contraseña incorrectas.');
  }

  const profile = await fetchProfile(data.user.id);
  return toSession(profile);
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  try {
    const profile = await fetchProfile(data.session.user.id);
    return toSession(profile);
  } catch {
    return null;
  }
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(async (_event, authSession) => {
    if (!authSession) {
      callback(null);
      return;
    }
    try {
      const profile = await fetchProfile(authSession.user.id);
      callback(toSession(profile));
    } catch {
      callback(null);
    }
  });
  return data.subscription;
}

export async function logout() {
  await supabase.auth.signOut();
}
