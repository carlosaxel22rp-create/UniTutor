-- =============================================================================
-- EduConnect · Migración 0003 · Catálogo inicial (tomado del diseño Figma)
-- Los slugs coinciden con los ids del prototipo (it, gastronomy, biotech,
-- marketing, algorithms, …) para mapear iconos/gradientes en el frontend.
-- =============================================================================

insert into public.careers (slug, name, accent) values
  ('it',         'Tecnologías de la Información', 'blue'),
  ('gastronomy', 'Gastronomía',                   'orange'),
  ('biotech',    'Biotecnología',                 'emerald'),
  ('marketing',  'Mercadotecnia',                 'purple')
on conflict (slug) do nothing;

insert into public.subjects (career_id, slug, name, icon)
select c.id, v.slug, v.name, v.icon
from (values
  ('it',         'algorithms',          'Algoritmos',                 '🧮'),
  ('it',         'data-structures',     'Estructuras de Datos',       '🗂️'),
  ('it',         'machine-learning',    'Aprendizaje Automático',     '🤖'),
  ('it',         'python',              'Python',                     '🐍'),
  ('it',         'web-development',     'Desarrollo Web',             '🌐'),
  ('it',         'databases',           'Bases de Datos',             '🗄️'),
  ('gastronomy', 'food-science',        'Ciencia de los Alimentos',   '🔬'),
  ('gastronomy', 'pastry-arts',         'Repostería',                 '🥐'),
  ('gastronomy', 'culinary-techniques', 'Técnicas Culinarias',        '👨‍🍳'),
  ('gastronomy', 'nutrition',           'Nutrición',                  '🥗'),
  ('biotech',    'cell-biology',        'Biología Celular',           '🦠'),
  ('biotech',    'genetics',            'Genética',                   '🧬'),
  ('biotech',    'molecular-biology',   'Biología Molecular',         '⚗️'),
  ('biotech',    'biochemistry',        'Bioquímica',                 '🧪'),
  ('marketing',  'brand-strategy',      'Estrategia de Marca',        '💡'),
  ('marketing',  'consumer-behavior',   'Comportamiento del Consumidor','📊'),
  ('marketing',  'digital-marketing',   'Marketing Digital',          '📱'),
  ('marketing',  'market-research',     'Investigación de Mercados',  '🔍')
) as v(career_slug, slug, name, icon)
join public.careers c on c.slug = v.career_slug
on conflict (slug) do nothing;
