-- ============================================================================
-- UniTutor — esquema de base de datos para Supabase
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CARRERAS (catálogo fijo, referenciado por el código de 4 letras
--    embebido en la matrícula: TIID, BIIO, GTRO, MERC)
-- ----------------------------------------------------------------------------
create table public.careers (
  id text primary key,
  name text not null,
  code text not null unique
);

insert into public.careers (id, name, code) values
  ('it', 'Tecnologías de la Información', 'TIID'),
  ('gastro', 'Gastronomía', 'GTRO'),
  ('bio', 'Biotecnología', 'BIIO'),
  ('mkt', 'Mercadotecnia', 'MERC');

alter table public.careers enable row level security;
create policy "Lectura pública de carreras" on public.careers for select using (true);

-- ----------------------------------------------------------------------------
-- 2. PERFILES (extiende auth.users con matrícula, nombre y carrera)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  matricula text not null unique
    constraint matricula_format check (matricula ~ '^UTOM[0-9]{4}(TIID|BIIO|GTRO|MERC)$'),
  name text not null,
  email text not null,
  career_id text not null references public.careers (id),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "El usuario ve su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "El usuario actualiza su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- La fila de perfil se crea únicamente vía el trigger de abajo (security definer),
-- nunca con un insert directo del cliente.

-- ----------------------------------------------------------------------------
-- 3. TRIGGER: al registrarse en auth.users, crea el perfil automáticamente
--    usando los metadatos (matricula, name, career) pasados en el signUp,
--    y valida que el código de carrera dentro de la matrícula coincida
--    con la carrera seleccionada.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_matricula text := upper(new.raw_user_meta_data ->> 'matricula');
  v_career_id text := new.raw_user_meta_data ->> 'career';
  v_name text := new.raw_user_meta_data ->> 'name';
  v_expected_code text;
begin
  select code into v_expected_code from public.careers where id = v_career_id;

  if v_expected_code is null then
    raise exception 'Carrera inválida.';
  end if;

  if right(v_matricula, 4) <> v_expected_code then
    raise exception 'El código de carrera de la matrícula (%) no corresponde a la carrera seleccionada.', right(v_matricula, 4);
  end if;

  insert into public.profiles (id, matricula, name, email, career_id)
  values (new.id, v_matricula, v_name, new.email, v_career_id);

  return new;
exception
  when unique_violation then
    raise exception 'Ya existe una cuenta registrada con esa matrícula.';
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. RPC: resuelve el email a partir de la matrícula, para poder "iniciar
--    sesión con matrícula" aunque Supabase Auth autentique por email.
--    Es SECURITY DEFINER para poder leer profiles.email sin exponer la tabla
--    completa a usuarios anónimos.
-- ----------------------------------------------------------------------------
create or replace function public.get_email_by_matricula(p_matricula text)
returns text
language sql
security definer set search_path = public
stable
as $$
  select email from public.profiles where matricula = upper(p_matricula) limit 1;
$$;

grant execute on function public.get_email_by_matricula(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. MATERIAS (mapa curricular)
-- ----------------------------------------------------------------------------
create table public.subjects (
  id text primary key,
  career_id text references public.careers (id), -- null = materia genérica/troncal
  semester text, -- ej. '1er Cuatrimestre'; null para las genéricas
  name text not null,
  image text
);

alter table public.subjects enable row level security;
create policy "Lectura pública de materias" on public.subjects for select using (true);

-- ----------------------------------------------------------------------------
-- 6. TUTORES
-- ----------------------------------------------------------------------------
create table public.tutors (
  id uuid primary key default gen_random_uuid(),
  legacy_id int, -- solo para referencia/semillas, no se usa en la app
  name text not null,
  age int,
  rating numeric(2, 1) default 5.0,
  reviews int default 0,
  image text,
  description text
);

alter table public.tutors enable row level security;
create policy "Lectura pública de tutores" on public.tutors for select using (true);

-- ----------------------------------------------------------------------------
-- 7. MATERIAS QUE IMPARTE CADA TUTOR (muchos a muchos)
-- ----------------------------------------------------------------------------
create table public.tutor_subjects (
  tutor_id uuid references public.tutors (id) on delete cascade,
  subject_id text references public.subjects (id) on delete cascade,
  primary key (tutor_id, subject_id)
);

alter table public.tutor_subjects enable row level security;
create policy "Lectura pública de materias por tutor" on public.tutor_subjects for select using (true);

-- ----------------------------------------------------------------------------
-- 8. HORARIOS DISPONIBLES POR TUTOR
-- ----------------------------------------------------------------------------
create table public.tutor_availability (
  id bigint generated always as identity primary key,
  tutor_id uuid references public.tutors (id) on delete cascade,
  slot text not null -- ej. '09:00 AM'
);

alter table public.tutor_availability enable row level security;
create policy "Lectura pública de horarios" on public.tutor_availability for select using (true);

-- ----------------------------------------------------------------------------
-- 9. RESERVAS (agendar tutoría)
-- ----------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  tutor_id uuid not null references public.tutors (id),
  subject_id text not null references public.subjects (id),
  scheduled_at timestamptz not null,
  status text not null default 'confirmada', -- confirmada | cancelada | completada
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "El estudiante ve sus propias reservas"
  on public.bookings for select
  using (auth.uid() = student_id);

create policy "El estudiante crea sus propias reservas"
  on public.bookings for insert
  with check (auth.uid() = student_id);

create policy "El estudiante actualiza sus propias reservas"
  on public.bookings for update
  using (auth.uid() = student_id);

-- ============================================================================
-- SEMILLAS — mismos datos que hoy están hardcodeados en src/App.jsx,
-- para que la base de datos ya tenga contenido real desde el día uno.
-- ============================================================================

-- Materias (mapa curricular de TI + genéricas para las demás carreras)
insert into public.subjects (id, career_id, semester, name, image) values
  ('it1-1', 'it', '1er Cuatrimestre', 'Inglés I', 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80'),
  ('it1-2', 'it', '1er Cuatrimestre', 'Desarrollo Humano y Valores', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&q=80'),
  ('it1-3', 'it', '1er Cuatrimestre', 'Fundamentos Matemáticos', 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80'),
  ('it1-4', 'it', '1er Cuatrimestre', 'Fundamentos de Redes', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80'),
  ('it1-5', 'it', '1er Cuatrimestre', 'Física', 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&q=80'),
  ('it1-6', 'it', '1er Cuatrimestre', 'Fundamentos de Programación', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80'),
  ('it1-7', 'it', '1er Cuatrimestre', 'Comunicación y Habilidades Digitales', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80'),
  ('it2-1', 'it', '2do Cuatrimestre', 'Inglés II', 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80'),
  ('it2-2', 'it', '2do Cuatrimestre', 'Habilidades Socioemocionales y Manejo de Conflictos', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&q=80'),
  ('it2-3', 'it', '2do Cuatrimestre', 'Cálculo Diferencial', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80'),
  ('it2-4', 'it', '2do Cuatrimestre', 'Conmutación y Enrutamiento de Redes', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&q=80'),
  ('it2-5', 'it', '2do Cuatrimestre', 'Probabilidad y Estadística', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80'),
  ('it2-6', 'it', '2do Cuatrimestre', 'Programación Estructurada', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80'),
  ('it2-7', 'it', '2do Cuatrimestre', 'Bases de Datos', 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&q=80'),
  ('it3-1', 'it', '3er Cuatrimestre', 'Inglés III', 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80'),
  ('it3-2', 'it', '3er Cuatrimestre', 'Desarrollo del Pensamiento y Toma de Decisiones', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80'),
  ('it3-3', 'it', '3er Cuatrimestre', 'Cálculo Integral', 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80'),
  ('it3-4', 'it', '3er Cuatrimestre', 'Tópicos de Calidad para el Diseño de Software', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80'),
  ('it3-5', 'it', '3er Cuatrimestre', 'Programación Orientada a Objetos', 'https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?w=400&q=80'),
  ('it3-6', 'it', '3er Cuatrimestre', 'Estructura de Datos', 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&q=80'),
  ('it3-7', 'it', '3er Cuatrimestre', 'Sistemas Operativos', 'https://images.unsplash.com/photo-1629654261662-779ee3e0e4cc?w=400&q=80'),
  ('it4-1', 'it', '4to Cuatrimestre', 'Inglés IV', 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80'),
  ('it4-2', 'it', '4to Cuatrimestre', 'Ética Profesional', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80'),
  ('it4-3', 'it', '4to Cuatrimestre', 'Cálculo de Varias Variables', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80'),
  ('it4-4', 'it', '4to Cuatrimestre', 'Aplicaciones Web', 'https://images.unsplash.com/photo-1627398240309-08a1a5362a53?w=400&q=80'),
  ('it4-5', 'it', '4to Cuatrimestre', 'Desarrollo de Aplicaciones Móviles', 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&q=80'),
  ('it4-6', 'it', '4to Cuatrimestre', 'Bases de Datos Avanzadas', 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&q=80'),
  ('it4-7', 'it', '4to Cuatrimestre', 'Proyecto Integrador I', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80'),
  ('it5-1', 'it', '5to Cuatrimestre', 'Inglés V', 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80'),
  ('it5-2', 'it', '5to Cuatrimestre', 'Liderazgo de Equipos de Alto Desempeño', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80'),
  ('it5-3', 'it', '5to Cuatrimestre', 'Ecuaciones Diferenciales', 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&q=80'),
  ('it5-4', 'it', '5to Cuatrimestre', 'Aplicaciones Web Orientadas a Servicios', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80'),
  ('it5-5', 'it', '5to Cuatrimestre', 'Análisis y Diseño de Software', 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=400&q=80'),
  ('it5-6', 'it', '5to Cuatrimestre', 'Estándares y Métricas para el Desarrollo de Software', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80'),
  ('it5-7', 'it', '5to Cuatrimestre', 'Proyecto Integrador II', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80'),
  ('it7-1', 'it', '7mo Cuatrimestre', 'Inglés VI', 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80'),
  ('it7-2', 'it', '7mo Cuatrimestre', 'Habilidades Gerenciales', 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80'),
  ('it7-3', 'it', '7mo Cuatrimestre', 'Formulación de Proyectos de Tecnología', 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&q=80'),
  ('it7-4', 'it', '7mo Cuatrimestre', 'Fundamentos de Inteligencia Artificial', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&q=80'),
  ('it7-5', 'it', '7mo Cuatrimestre', 'Ética y Legislación en Tecnologías de la Información', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80'),
  ('it7-6', 'it', '7mo Cuatrimestre', 'Optativa I', 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&q=80'),
  ('it8-1', 'it', '8vo Cuatrimestre', 'Inglés VII', 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80'),
  ('it8-2', 'it', '8vo Cuatrimestre', 'Electrónica Digital', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80'),
  ('it8-3', 'it', '8vo Cuatrimestre', 'Gestión de Proyectos de Tecnología', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&q=80'),
  ('it8-4', 'it', '8vo Cuatrimestre', 'Programación para Inteligencia Artificial', 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=400&q=80'),
  ('it8-5', 'it', '8vo Cuatrimestre', 'Administración de Servidores', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80'),
  ('it8-6', 'it', '8vo Cuatrimestre', 'Seguridad Informática', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&q=80'),
  ('it8-7', 'it', '8vo Cuatrimestre', 'Optativa II', 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&q=80'),
  ('it9-1', 'it', '9no Cuatrimestre', 'Inglés VIII', 'https://images.unsplash.com/photo-1546410531-f?w=400&q=80'),
  ('it9-2', 'it', '9no Cuatrimestre', 'Internet de las Cosas', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80'),
  ('it9-3', 'it', '9no Cuatrimestre', 'Evaluación de Proyectos de Tecnología', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80'),
  ('it9-4', 'it', '9no Cuatrimestre', 'Ciencia de Datos', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80'),
  ('it9-5', 'it', '9no Cuatrimestre', 'Tecnologías Disruptivas', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80'),
  ('it9-6', 'it', '9no Cuatrimestre', 'Informática Forense', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80'),
  ('it9-7', 'it', '9no Cuatrimestre', 'Optativa III', 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&q=80'),
  ('it9-8', 'it', '9no Cuatrimestre', 'Proyecto Integrador III', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80'),
  ('gen-1', null, null, 'Materia Troncal 1', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80'),
  ('gen-2', null, null, 'Materia Troncal 2', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80'),
  ('gen-3', null, null, 'Asignatura Especializante', 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&q=80');

-- Tutores base
insert into public.tutors (legacy_id, name, age, rating, reviews, image, description) values
  (1, 'Carlos Axel Rodea', 20, 5, 34, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80', '¡Hola! Me gusta enseñar con ejemplos prácticos y proyectos reales para que la teoría tenga sentido y sea fácil de aplicar.'),
  (2, 'Danna Paola', 20, 4.9, 28, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80', 'Apasionada por el diseño y la estructura. Te ayudo a que tus proyectos no solo funcionen, sino que destaquen por su calidad.'),
  (3, 'Luis Fernando', 22, 4.5, 12, 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&q=80', 'Si tienes problemas entendiendo conceptos complejos, soy tu mejor opción para simplificarlos y que apruebes el examen.'),
  (4, 'María José', 21, 4.8, 45, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80', 'La paciencia y dedicación son mi lema. Avanzaremos a tu propio ritmo hasta que domines el tema por completo.'),
  (5, 'Javier Domínguez', 23, 4.7, 19, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80', 'Enfocado en resultados y en prepararte con simuladores de exámenes para los retos más difíciles del cuatrimestre.'),
  (6, 'Ana Victoria', 19, 5, 11, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&q=80', 'Comparto mis apuntes, resúmenes organizados y trucos para aprender rápido, eficientemente y sin estrés.'),
  (7, 'Miguel Ángel', 24, 4.6, 33, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80', 'Tengo experiencia asesorando a más de 30 compañeros en la universidad, siempre buscando la excelencia académica.'),
  (8, 'Sofía Reyes', 20, 4.9, 22, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80', 'Haremos sesiones dinámicas e interactivas. Resolveremos guías de estudio completas para que vayas 100% seguro.'),
  (9, 'Roberto Gómez', 22, 4.4, 15, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80', 'Conmigo aprenderás la lógica y el "por qué" detrás de cada problema, no solo a memorizar procesos mecánicos.');

-- Horarios disponibles (los mismos 4 slots para cada tutor)
insert into public.tutor_availability (tutor_id, slot)
select t.id, slot
from public.tutors t
cross join (values ('09:00 AM'), ('12:00 PM'), ('04:00 PM'), ('06:00 PM')) as s (slot);
